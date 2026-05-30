/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// e2eではexpress.Response型/Set-Cookie等が複雑になりanyになりがちなのでルール緩和

/**
 * Notion OAuth フロー 結合試験
 *
 *  - 外部 fetch (Notion API) は vi.stubGlobal で mock
 *  - DB は実 Prisma、user は事前 upsert、integration は beforeEach で deleteMany
 *  - JWT は実 JwtService で発行
 *
 * 単体試験では拾いきれない、層間の副作用（暗号化DB書込、Set-Cookie、filter経由のredirect）
 * を中心に検証する。Notion 側の仕様変化に強いように、`vi.stubGlobal` で
 * Notion API のレスポンスをテストごとに差し替えられる構成とする。
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import cookieParser from 'cookie-parser';

// controller.ts は import 時に `process.env.FRONTEND_URL` を定数に固定する。
// vi.hoisted は import 文より先に実行されるため、ここで Notion 関連 env を仕込んでおく。
vi.hoisted(() => {
  process.env.NOTION_CLIENT_ID = 'test-client-id';
  process.env.NOTION_CLIENT_SECRET = 'test-client-secret';
  process.env.NOTION_REDIRECT_URI =
    'http://localhost:3001/api/integrations/notion/callback';
  // AES-256-GCM 用 32バイト鍵を hex 文字列で
  process.env.NOTION_TOKEN_ENC_KEY = 'a'.repeat(64);
  process.env.FRONTEND_URL = 'http://localhost:3000';
});

// JWT_SECRET / DATABASE_URL を .env から読み込む（vi.hoisted の後・他 import の前）
import 'dotenv/config';

import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CipherService } from '../../../src/common/encryption/cipher.service';
import { customValidationPipe } from '../../../src/common/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../../../src/common/filters/global.exception.filter';
import {
  COOKIE_OAUTH_DECK_ID,
  COOKIE_OAUTH_STATE,
  COOKIE_OAUTH_USER_ID,
} from '../../../src/integrations/notion/notion-oauth.cookies';

const FRONTEND_URL = 'http://localhost:3000';

describe('Notion OAuth (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let cipher: CipherService;

  // 結合試験中は固定の試験ユーザを使う
  const user = {
    id: 'notion-int-user-1',
    username: 'notion_int_user',
    email: 'notion-int@example.com',
    passwordHash: 'dummy-hash',
  };
  let token: string;

  /** Notion /v1/oauth/token の正常レスポンス body */
  const notionOk = {
    access_token: 'AT-plain-xxx',
    refresh_token: 'RT-plain-yyy',
    workspace_id: 'ws-1',
    workspace_name: 'My Workspace',
    // 保存対象外
    workspace_icon: 'ignored',
    bot_id: 'ignored',
    token_type: 'bearer',
  };

  /**
   * fetch を stub するヘルパ
   *  - Notion 以外の URL に来た場合は例外を投げて「想定外の外部通信」を検出する
   *  - 返却 status / body をテスト毎に切り替え可能
   */
  const stubFetch = (status: number, body: unknown) => {
    const fn = vi.fn((input: unknown) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      if (!url.startsWith('https://api.notion.com/')) {
        throw new Error(`Unexpected fetch URL: ${url}`);
      }
      return {
        ok: status >= 200 && status < 300,
        status,
        json: () => body,
      } as unknown as Response;
    });
    vi.stubGlobal('fetch', fn);
    return fn;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // main.ts と同じセットアップを再現
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(customValidationPipe);
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.use(cookieParser());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    cipher = moduleFixture.get<CipherService>(CipherService);

    // 試験ユーザを upsert（既存 run の残骸があっても安全）
    await prisma.user.upsert({
      where: { id: user.id },
      update: { username: user.username, email: user.email },
      create: user,
    });

    token = jwtService.sign({ sub: user.id, email: user.email });
  });

  beforeEach(async () => {
    // integration テーブルだけ毎回掃除（user は残す）
    await prisma.notionIntegration.deleteMany({ where: { userId: user.id } });
  });

  afterEach(() => {
    // fetch の差し替えを必ず元に戻す
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    // 後始末（他テストファイルに影響を残さないため）
    await prisma.notionIntegration.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await app.close();
  });

  // ===========================================================================
  // A. GET /integrations/notion/auth
  // ===========================================================================
  describe('GET /integrations/notion/auth', () => {
    it('A-1: 未認証 → 401', async () => {
      // [試験項目: 未認証拒否]
      await request(app.getHttpServer())
        .get('/integrations/notion/auth?deckId=10')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('A-2: deckId 未指定 → 400', async () => {
      // [試験項目: deckId 必須]
      await request(app.getHttpServer())
        .get('/integrations/notion/auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('A-3: 正常系 → 302で Notion authorize URL へ', async () => {
      // [試験項目: 認可URL組立]
      const res = await request(app.getHttpServer())
        .get('/integrations/notion/auth?deckId=99')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FOUND);

      const location = res.headers['location'];
      const url = new URL(location);
      // 設計書 §3.1 の必須5パラメータ
      expect(url.origin + url.pathname).toBe(
        'https://api.notion.com/v1/oauth/authorize',
      );
      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('owner')).toBe('user');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3001/api/integrations/notion/callback',
      );
      // state は 32バイト hex = 64文字
      expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('A-4: 正常系 → Set-Cookie 3つに HttpOnly / SameSite=Lax / Max-Age=300', async () => {
      // [試験項目: Cookie 属性]
      const res = await request(app.getHttpServer())
        .get('/integrations/notion/auth?deckId=99')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FOUND);

      const raw = res.headers['set-cookie'];
      const arr: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

      // 3つの Cookie 名がそれぞれ存在
      expect(arr.some((c) => c.startsWith(`${COOKIE_OAUTH_STATE}=`))).toBe(
        true,
      );
      expect(arr.some((c) => c.startsWith(`${COOKIE_OAUTH_DECK_ID}=99`))).toBe(
        true,
      );
      expect(
        arr.some((c) => c.startsWith(`${COOKIE_OAUTH_USER_ID}=${user.id}`)),
      ).toBe(true);
      // 各 Cookie に共通の属性
      for (const c of arr) {
        expect(c).toMatch(/HttpOnly/i);
        expect(c).toMatch(/SameSite=Lax/i);
        expect(c).toMatch(/Path=\//);
        expect(c).toMatch(/Max-Age=300/); // 5分
      }
    });
  });

  // ===========================================================================
  // B. GET /integrations/notion/callback (主役)
  // ===========================================================================
  describe('GET /integrations/notion/callback', () => {
    const state = 'STATE-FIXED-VALUE';
    const deckId = '88';

    /** Cookie ヘッダ生成。'__omit__' でそのキーを送らない動作になる */
    const cookieHeader = (
      overrides: Partial<{
        state: string;
        deckId: string;
        userId: string;
      }> = {},
    ) => {
      const s = overrides.state ?? state;
      const d = overrides.deckId ?? deckId;
      const u = overrides.userId ?? user.id;
      const parts: string[] = [];
      if (s !== '__omit__') parts.push(`${COOKIE_OAUTH_STATE}=${s}`);
      if (d !== '__omit__') parts.push(`${COOKIE_OAUTH_DECK_ID}=${d}`);
      if (u !== '__omit__') parts.push(`${COOKIE_OAUTH_USER_ID}=${u}`);
      return parts.join('; ');
    };

    /** clearCookie 由来の Set-Cookie 3 件（値が空、Expires が過去）を検証 */
    const expectAllCookiesCleared = (raw: unknown) => {
      const arr: string[] = Array.isArray(raw)
        ? (raw as string[])
        : raw
          ? [raw as string]
          : [];
      const find = (name: string) => arr.find((c) => c.startsWith(`${name}=`));
      for (const name of [
        COOKIE_OAUTH_STATE,
        COOKIE_OAUTH_DECK_ID,
        COOKIE_OAUTH_USER_ID,
      ]) {
        const c = find(name);
        expect(c, `${name} clearing entry`).toBeDefined();
        // 値が空（"name=;"）
        expect(c).toMatch(new RegExp(`^${name}=;`));
        // Expires が 1970 = 破棄扱い
        expect(c).toMatch(/Expires=Thu, 01 Jan 1970/);
      }
    };

    it('B-1: 正常系 → DB に暗号化保存、Cookie3つclear、import URL へ redirect', async () => {
      // [試験項目: callback 正常系 全パス]
      const fetchMock = stubFetch(200, notionOk);

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=${state}`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      // redirect 先
      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}/notion-import`,
      );

      // Cookie 3 つ clear
      expectAllCookiesCleared(res.headers['set-cookie']);

      // DB に upsert
      const saved = await prisma.notionIntegration.findUnique({
        where: { userId: user.id },
      });
      expect(saved).not.toBeNull();
      expect(saved!.workspaceId).toBe(notionOk.workspace_id);
      expect(saved!.workspaceName).toBe(notionOk.workspace_name);

      // 暗号文は平文と異なる
      expect(saved!.accessTokenEnc).not.toBe(notionOk.access_token);
      expect(saved!.refreshTokenEnc).not.toBe(notionOk.refresh_token);
      // 復号で元の平文に戻る
      expect(cipher.decrypt(saved!.accessTokenEnc)).toBe(notionOk.access_token);
      expect(cipher.decrypt(saved!.refreshTokenEnc)).toBe(
        notionOk.refresh_token,
      );

      // fetch が 1 回、仕様通りのリクエストで呼ばれた
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toBe('https://api.notion.com/v1/oauth/token');
      const expectedBasic = Buffer.from(
        'test-client-id:test-client-secret',
      ).toString('base64');
      expect((init.headers as Record<string, string>)['Authorization']).toBe(
        `Basic ${expectedBasic}`,
      );
      expect(JSON.parse(init.body as string)).toEqual({
        grant_type: 'authorization_code',
        code: 'CODE',
        redirect_uri: 'http://localhost:3001/api/integrations/notion/callback',
      });
    });

    it('B-2: 既存レコードの再連携 → upsert で上書き、件数増えない', async () => {
      // [試験項目: callback 上書き]
      // 別 workspace での既存連携を置いてから callback
      await prisma.notionIntegration.create({
        data: {
          userId: user.id,
          accessTokenEnc: cipher.encrypt('OLD-AT'),
          refreshTokenEnc: cipher.encrypt('OLD-RT'),
          workspaceId: 'ws-OLD',
          workspaceName: 'Old Workspace',
        },
      });

      stubFetch(200, notionOk);

      await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=${state}`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      const all = await prisma.notionIntegration.findMany({
        where: { userId: user.id },
      });
      expect(all).toHaveLength(1);
      expect(all[0].workspaceId).toBe(notionOk.workspace_id);
      expect(all[0].workspaceName).toBe(notionOk.workspace_name);
      // 暗号化トークンも新値に
      expect(cipher.decrypt(all[0].accessTokenEnc)).toBe(notionOk.access_token);
      expect(cipher.decrypt(all[0].refreshTokenEnc)).toBe(
        notionOk.refresh_token,
      );
    });

    it('B-3: state 不一致 → notion_invalid redirect、Cookie clear、fetch 呼ばれない', async () => {
      // [試験項目: state 不一致]
      const fetchMock = stubFetch(200, notionOk);

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=DIFFERENT`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_invalid`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        await prisma.notionIntegration.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('B-4: Notion API が 400 → notion_failed redirect、Cookie clear、DB 変化なし', async () => {
      // [試験項目: Notion 4xx]
      stubFetch(400, { error: 'invalid_grant' });

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=${state}`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_failed`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
      expect(
        await prisma.notionIntegration.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('B-5: Notion レスポンス必須項目欠落 → notion_failed redirect', async () => {
      // [試験項目: Notion レスポンス不正]
      // refresh_token が欠けているケース
      stubFetch(200, {
        access_token: 'a',
        workspace_id: 'w',
        workspace_name: 'n',
      });

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=${state}`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_failed`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
      expect(
        await prisma.notionIntegration.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('B-6: error=access_denied & state一致 → notion_cancelled redirect、Cookie clear、fetch 呼ばれない', async () => {
      // [試験項目: access_denied 分岐]
      // 直近で error 分岐にも clearOAuthCookies を追加した変更のリグレッション検出
      const fetchMock = stubFetch(200, notionOk);

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?state=${state}&error=access_denied`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_cancelled`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        await prisma.notionIntegration.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('B-7: code 欠落 → notion_invalid redirect', async () => {
      // [試験項目: code 欠落]
      stubFetch(200, notionOk);

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?state=${state}`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_invalid`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
    });

    it('B-8: userId Cookie 欠落 → notion_invalid redirect', async () => {
      // [試験項目: userId Cookie 欠落]
      stubFetch(200, notionOk);

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=${state}`)
        .set('Cookie', cookieHeader({ userId: '__omit__' }))
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_invalid`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
    });

    it('B-9: deckId Cookie 欠落 → filter fallback で /decks/decks redirect', async () => {
      // [試験項目: deckId Cookie 欠落 + filter fallback]
      // filter は deckId 不在時に '/decks' を埋め込むため URL は
      //   /decks/${'/decks'}?... = /decks//decks?...
      // となる（ダブルスラッシュは現状仕様。気になるなら filter 改修で fallback を空文字に）
      stubFetch(200, notionOk);

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=${state}`)
        .set('Cookie', cookieHeader({ deckId: '__omit__' }))
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks//decks?integration=notion_invalid`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
    });
  });

  // ===========================================================================
  // C. GET /integrations/notion/status
  // ===========================================================================
  describe('GET /integrations/notion/status', () => {
    it('C-1: 未認証 → 401', async () => {
      // [試験項目: status 未認証]
      await request(app.getHttpServer())
        .get('/integrations/notion/status')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('C-2: 未連携 → { connected: false }、workspaceName 含まない', async () => {
      // [試験項目: status 未連携]
      const res = await request(app.getHttpServer())
        .get('/integrations/notion/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({ connected: false });
    });

    it('C-3: 連携済 → { connected: true, workspaceName }', async () => {
      // [試験項目: status 連携済]
      await prisma.notionIntegration.create({
        data: {
          userId: user.id,
          accessTokenEnc: cipher.encrypt('AT'),
          refreshTokenEnc: cipher.encrypt('RT'),
          workspaceId: 'ws-1',
          workspaceName: 'My Workspace',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/integrations/notion/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({
        connected: true,
        workspaceName: 'My Workspace',
      });
    });
  });

  // ===========================================================================
  // D. DELETE /integrations/notion
  // ===========================================================================
  describe('DELETE /integrations/notion', () => {
    it('D-1: 未認証 → 401', async () => {
      // [試験項目: 削除 未認証]
      await request(app.getHttpServer())
        .delete('/integrations/notion')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('D-2: 連携済 → 204、DBから消える', async () => {
      // [試験項目: 削除 成功]
      await prisma.notionIntegration.create({
        data: {
          userId: user.id,
          accessTokenEnc: cipher.encrypt('AT'),
          refreshTokenEnc: cipher.encrypt('RT'),
          workspaceId: 'ws-1',
          workspaceName: 'name',
        },
      });

      await request(app.getHttpServer())
        .delete('/integrations/notion')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NO_CONTENT);

      const after = await prisma.notionIntegration.findUnique({
        where: { userId: user.id },
      });
      expect(after).toBeNull();
    });

    it('D-3: 未連携でも 204（冪等）', async () => {
      // [試験項目: 削除 冪等]
      await request(app.getHttpServer())
        .delete('/integrations/notion')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });
});
