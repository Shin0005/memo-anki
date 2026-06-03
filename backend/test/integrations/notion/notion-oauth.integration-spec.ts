/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// e2eではexpress.Response型/Set-Cookie等が複雑になりanyになりがちなのでルール緩和

/**
 * Notion OAuth フロー 結合試験
 *
 *  - 外部 Notion 通信は @notionhq/client (SDK) の `Client.oauth.token` を vi.mock で差し替え
 *  - DB は実 Prisma、user は事前 upsert、integration は beforeEach で deleteMany
 *  - JWT は実 JwtService で発行
 *
 * 単体試験では拾いきれない、層間の副作用（暗号化DB書込、Set-Cookie、filter経由のredirect）
 * を中心に検証する。Notion SDK のレスポンスはテスト毎に mockResolvedValue / mockRejectedValue
 * で差し替えられる構成とする。
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
  vi,
} from 'vitest';
import cookieParser from 'cookie-parser';
import {
  APIResponseError,
  RequestTimeoutError,
  type OauthTokenResponse,
} from '@notionhq/client';

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

// Notion SDK Client.oauth.token を vi.hoisted で先に作って差し替え
// APIResponseError 等のエラークラスは instanceof 判定に使うので実物を残す
const { mockOauthToken } = vi.hoisted(() => ({
  mockOauthToken: vi.fn(),
}));

vi.mock('@notionhq/client', async () => {
  const actual =
    await vi.importActual<typeof import('@notionhq/client')>(
      '@notionhq/client',
    );
  return {
    ...actual,
    // Client は service 内で new されるので class で差し替える
    Client: class {
      oauth = { token: mockOauthToken };
    },
  };
});

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
} from '../../../src/integrations/notion/oauth/notion-oauth.cookies';

const FRONTEND_URL = 'http://localhost:3000';

/**
 * SDK の OauthTokenResponse は workspace_icon / bot_id / owner / token_type 等の必須項目を
 * 多く含むが、service 側ではこれら 4 項目しか参照しないため、テストでは Partial を
 * OauthTokenResponse としてキャストして渡す。
 */
const buildOauthResponse = (
  overrides: Partial<OauthTokenResponse> = {},
): OauthTokenResponse =>
  ({
    access_token: 'AT-plain-xxx',
    refresh_token: 'RT-plain-yyy',
    workspace_id: 'ws-1',
    workspace_name: 'My Workspace',
    // 保存対象外
    workspace_icon: 'ignored',
    bot_id: 'ignored',
    token_type: 'bearer',
    ...overrides,
  }) as OauthTokenResponse;

/** Notion 側 4xx/5xx を再現する APIResponseError を作る */
const buildApiResponseError = (status: number, code: string) =>
  new APIResponseError({
    code: code as never,
    status,
    message: code,
    headers: new Headers(),
    rawBodyText: `{"error":"${code}"}`,
    additional_data: undefined,
    request_id: undefined,
  });

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

  /** Notion oauth.token の正常レスポンス body（参照しやすいよう値を保持） */
  const notionOk = {
    access_token: 'AT-plain-xxx',
    refresh_token: 'RT-plain-yyy',
    workspace_id: 'ws-1',
    workspace_name: 'My Workspace',
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
    // SDK モックを毎回リセット（前テストの mockResolvedValue を引きずらない）
    mockOauthToken.mockReset();
    // integration テーブルだけ毎回掃除（user は残す）
    await prisma.notionIntegration.deleteMany({ where: { userId: user.id } });
  });

  afterAll(async () => {
    // 後始末（他テストファイルに影響を残さないため）
    await prisma.notionIntegration.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await app.close();
  });

  describe('GET /integrations/notion/auth', () => {
    it('A-1: 未認証 → 401', async () => {
      await request(app.getHttpServer())
        .get('/integrations/notion/auth?deckId=10')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('A-2: deckId 未指定 → 400', async () => {
      await request(app.getHttpServer())
        .get('/integrations/notion/auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('A-3: 正常系 → 200 で Notion authorize URL を JSON で返す', async () => {
      // SDK 化に伴い、controller はサーバー側でリダイレクトせず URL を JSON で返す仕様に変更された。
      // フロント側で window.location.href = url の形で遷移する。
      const res = await request(app.getHttpServer())
        .get('/integrations/notion/auth?deckId=99')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      // レスポンス body は { url: string } 形式
      expect(typeof res.body.url).toBe('string');
      const url = new URL(res.body.url as string);
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
      // 200 応答でも Set-Cookie は付与される（passthrough: true で res.cookie を使用）
      const res = await request(app.getHttpServer())
        .get('/integrations/notion/auth?deckId=99')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

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
      mockOauthToken.mockResolvedValue(buildOauthResponse());

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=${state}`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      // redirect 先（成功時は ?integration=notion_success）
      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_success`,
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

      // SDK の oauth.token が 1 回、仕様通りの引数で呼ばれた
      // （URL や Basic 認証の組み立ては SDK 側の責務なので、ここでは引数のみ検証）
      expect(mockOauthToken).toHaveBeenCalledTimes(1);
      expect(mockOauthToken).toHaveBeenCalledWith({
        grant_type: 'authorization_code',
        code: 'CODE',
        redirect_uri: 'http://localhost:3001/api/integrations/notion/callback',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
      });
    });

    it('B-2: 既存レコードの再連携 → upsert で上書き、件数増えない', async () => {
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

      mockOauthToken.mockResolvedValue(buildOauthResponse());

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

    it('B-3: state 不一致 → notion_invalid redirect、Cookie clear、SDK 呼ばれない', async () => {
      mockOauthToken.mockResolvedValue(buildOauthResponse());

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?code=CODE&state=DIFFERENT`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_invalid`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
      // state 検証で弾かれるので SDK までは到達しない
      expect(mockOauthToken).not.toHaveBeenCalled();
      expect(
        await prisma.notionIntegration.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('B-4: Notion API が 4xx (APIResponseError) → notion_failed redirect、Cookie clear、DB 変化なし', async () => {
      // SDK 化後は service が APIResponseError を捕捉して BadGatewayException に詰め替える。
      // それを NotionOAuthExceptionFilter が拾って notion_failed に倒す流れ。
      mockOauthToken.mockRejectedValue(
        buildApiResponseError(400, 'invalid_grant'),
      );

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

    it('B-4b: 通信エラー (RequestTimeoutError) → notion_failed redirect、Cookie clear、DB 変化なし', async () => {
      // SDK は通信失敗を RequestTimeoutError として返す。service 側は接続用の
      // BadGatewayException に詰め替える。filter の出力は同じく notion_failed。
      mockOauthToken.mockRejectedValue(
        new RequestTimeoutError('request timed out'),
      );

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
      // SDK 型上 refresh_token / workspace_name は nullable。null で来た時 service が
      // BadGatewayException を投げ、filter が notion_failed に倒す。
      mockOauthToken.mockResolvedValue(
        buildOauthResponse({
          refresh_token: null,
        }),
      );

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

    it('B-6: error=access_denied & state一致 → notion_cancelled redirect、Cookie clear、SDK 呼ばれない', async () => {
      // 直近で error 分岐にも clearOAuthCookies を追加した変更のリグレッション検出
      mockOauthToken.mockResolvedValue(buildOauthResponse());

      const res = await request(app.getHttpServer())
        .get(`/integrations/notion/callback?state=${state}&error=access_denied`)
        .set('Cookie', cookieHeader())
        .expect(HttpStatus.FOUND);

      expect(res.headers['location']).toBe(
        `${FRONTEND_URL}/decks/${deckId}?integration=notion_cancelled`,
      );
      expectAllCookiesCleared(res.headers['set-cookie']);
      expect(mockOauthToken).not.toHaveBeenCalled();
      expect(
        await prisma.notionIntegration.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('B-7: code 欠落 → notion_invalid redirect', async () => {
      mockOauthToken.mockResolvedValue(buildOauthResponse());

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
      mockOauthToken.mockResolvedValue(buildOauthResponse());

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
      // filter は deckId 不在時に '/decks' を埋め込むため URL は
      //   /decks/${'/decks'}?... = /decks//decks?...
      // となる（ダブルスラッシュは現状仕様。気になるなら filter 改修で fallback を空文字に）
      mockOauthToken.mockResolvedValue(buildOauthResponse());

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

  describe('GET /integrations/notion/status', () => {
    it('C-1: 未認証 → 401', async () => {
      await request(app.getHttpServer())
        .get('/integrations/notion/status')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('C-2: 未連携 → { connected: false }、workspaceName 含まない', async () => {
      const res = await request(app.getHttpServer())
        .get('/integrations/notion/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({ connected: false });
    });

    it('C-3: 連携済 → { connected: true, workspaceName }', async () => {
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

  describe('DELETE /integrations/notion', () => {
    it('D-1: 未認証 → 401', async () => {
      await request(app.getHttpServer())
        .delete('/integrations/notion')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('D-2: 連携済 → 204、DBから消える', async () => {
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
      await request(app.getHttpServer())
        .delete('/integrations/notion')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });
});
