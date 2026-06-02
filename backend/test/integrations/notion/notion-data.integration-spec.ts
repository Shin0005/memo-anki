/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// e2eではSDKレスポンス型/Notion union型が複雑になりany/castに頼りがち
// なのでルール緩和。

/**
 * Notion データ取得 結合試験
 *
 * 対象は薄いラッパー3本（Controller / Service / APIClient）+ Mapper + CardRepository。
 * 各層の固有ロジックは別途単体試験で担保しているため、ここでは
 *  - 各層を通したリクエスト/レスポンスの入出力
 *  - DB状態（import 時のみ）
 * の観点で結合テストを行う。
 *
 * 方針:
 *  - Notion SDK の `Client` は `vi.mock('@notionhq/client')` でメソッド単位差し替え
 *    （`APIResponseError` / `isFullDataSource` / `isFullPage` / `iteratePaginatedAPI` は
 *     実物を残す。型ガードやイテレーション挙動は本物のロジックを通したいため）
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
import { APIResponseError } from '@notionhq/client';
import type {
  DataSourceObjectResponse,
  PageObjectResponse,
  QueryDataSourceResponse,
  SearchResponse,
} from '@notionhq/client/build/src/api-endpoints';

// vi.hoisted は import より先に実行されるため、Notion 関連 env を仕込んでおく
vi.hoisted(() => {
  process.env.NOTION_CLIENT_ID = 'test-client-id';
  process.env.NOTION_CLIENT_SECRET = 'test-client-secret';
  process.env.NOTION_REDIRECT_URI =
    'http://localhost:3001/api/integrations/notion/callback';
  // AES-256-GCM 用 32バイト鍵を hex 文字列で
  process.env.NOTION_TOKEN_ENC_KEY = 'a'.repeat(64);
  process.env.FRONTEND_URL = 'http://localhost:3000';
});
import 'dotenv/config';

// Notion SDK Client のメソッドを vi.hoisted で先に作って差し替え
const { mockSearch, mockDataSourcesRetrieve, mockDataSourcesQuery } =
  vi.hoisted(() => ({
    mockSearch: vi.fn(),
    mockDataSourcesRetrieve: vi.fn(),
    mockDataSourcesQuery: vi.fn(),
  }));

vi.mock('@notionhq/client', async () => {
  const actual =
    await vi.importActual<typeof import('@notionhq/client')>(
      '@notionhq/client',
    );
  return {
    ...actual,
    // Client class を差し替え。auth は受け取るが使わない。
    Client: class {
      search = mockSearch;
      dataSources = {
        retrieve: mockDataSourcesRetrieve,
        query: mockDataSourcesQuery,
      };
    },
  };
});

import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CipherService } from '../../../src/common/encryption/cipher.service';
import { customValidationPipe } from '../../../src/common/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../../../src/common/filters/global.exception.filter';
import { CardType } from '@memo-anki/shared';

/**
 * isFullDataSource ガードを通過する最小限の DataSourceObjectResponse を作る
 * title は RichText を1個入れて mapper の連結処理を通す
 */
const buildDataSource = (
  id: string,
  title: string,
  overrides: Partial<DataSourceObjectResponse> = {},
): DataSourceObjectResponse =>
  ({
    object: 'data_source',
    id,
    title: title ? [{ plain_text: title }] : [],
    description: [],
    properties: {},
    icon: null,
    cover: null,
    url: `https://notion.so/${id}`,
    public_url: null,
    is_inline: false,
    in_trash: false,
    archived: false,
    created_time: '2026-01-01T00:00:00.000Z',
    last_edited_time: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as DataSourceObjectResponse;

/** isFullPage ガードを通過する最小限の PageObjectResponse を作る */
const buildPage = (
  id: string,
  properties: Record<string, unknown>,
): PageObjectResponse =>
  ({
    object: 'page',
    id,
    created_time: '2026-01-01T00:00:00.000Z',
    last_edited_time: '2026-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'u' },
    last_edited_by: { object: 'user', id: 'u' },
    cover: null,
    icon: null,
    parent: { type: 'data_source_id', data_source_id: 'ds-1' },
    archived: false,
    in_trash: false,
    properties,
    url: `https://notion.so/${id}`,
    public_url: null,
  }) as PageObjectResponse;

/** search レスポンスを作る */
const buildSearchResponse = (
  results: SearchResponse['results'],
): SearchResponse => ({
  type: 'page_or_data_source',
  page_or_data_source: {},
  object: 'list',
  next_cursor: null,
  has_more: false,
  results,
});

/** query レスポンスを作る */
const buildQueryResponse = (
  results: QueryDataSourceResponse['results'],
  has_more = false,
  next_cursor: string | null = null,
): QueryDataSourceResponse => ({
  type: 'page_or_data_source',
  page_or_data_source: {},
  object: 'list',
  next_cursor,
  has_more,
  results,
});

/** 5xx APIResponseError を作る（Notion 側障害） */
const buildServerError = () =>
  new APIResponseError({
    code: 'internal_server_error' as never,
    status: 500,
    message: 'internal_server_error',
    headers: new Headers(),
    rawBodyText: '{}',
    additional_data: undefined,
    request_id: undefined,
  });

describe('Notion Data (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let cipher: CipherService;

  // テスト対象ユーザ
  const user = {
    id: 'notion-data-int-user-1',
    username: 'notion_data_user',
    email: 'notion-data@example.com',
    passwordHash: 'dummy-hash',
  };
  let token: string;
  let myDeckId: bigint;

  // 他人（認可NG検証用）
  const otherUser = {
    id: 'notion-data-int-user-2',
    username: 'other_user',
    email: 'other@example.com',
    passwordHash: 'dummy-hash',
  };
  let otherDeckId: bigint;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // main.ts と同じセットアップ
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(customValidationPipe);
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.use(cookieParser());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    cipher = moduleFixture.get<CipherService>(CipherService);

    // 試験ユーザ2人をリセット
    await prisma.user.upsert({
      where: { id: user.id },
      update: { username: user.username, email: user.email },
      create: user,
    });
    await prisma.user.upsert({
      where: { id: otherUser.id },
      update: { username: otherUser.username, email: otherUser.email },
      create: otherUser,
    });

    // 各ユーザの deck を作成
    const myDeck = await prisma.deck.create({
      data: { userId: user.id, name: 'My Deck (Notion)' },
    });
    myDeckId = myDeck.id;
    const otherDeck = await prisma.deck.create({
      data: { userId: otherUser.id, name: 'Other Deck' },
    });
    otherDeckId = otherDeck.id;

    token = jwtService.sign({ sub: user.id, email: user.email });
  });

  beforeEach(async () => {
    // SDK モックを毎回リセット
    mockSearch.mockReset();
    mockDataSourcesRetrieve.mockReset();
    mockDataSourcesQuery.mockReset();

    // 自分の deck 配下の card をクリア（import の DB 検証用）
    await prisma.card.deleteMany({ where: { deckId: myDeckId } });
    await prisma.card.deleteMany({ where: { deckId: otherDeckId } });

    // 既存の NotionIntegration を一度全削除し、各テストで都度作る
    await prisma.notionIntegration.deleteMany({ where: { userId: user.id } });
  });
  // 自分作ったデータの後始末
  afterAll(async () => {
    await prisma.card
      .deleteMany({ where: { deckId: { in: [myDeckId, otherDeckId] } } })
      .catch(() => undefined);
    await prisma.deck
      .deleteMany({ where: { id: { in: [myDeckId, otherDeckId] } } })
      .catch(() => undefined);
    await prisma.notionIntegration
      .deleteMany({ where: { userId: { in: [user.id, otherUser.id] } } })
      .catch(() => undefined);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.user
      .delete({ where: { id: otherUser.id } })
      .catch(() => undefined);
    await app.close();
  });

  /** 自分の Notion 連携を作るヘルパ */
  const seedNotionIntegration = async () => {
    await prisma.notionIntegration.create({
      data: {
        userId: user.id,
        accessTokenEnc: cipher.encrypt('AT-test'),
        refreshTokenEnc: cipher.encrypt('RT-test'),
        workspaceId: 'ws-test',
        workspaceName: 'Test Workspace',
      },
    });
  };

  describe('GET /integrations/notion/databases', () => {
    it('1-1: 正常系 → 200、Mapper通過後の {id, title} 配列が返る', async () => {
      await seedNotionIntegration();
      mockSearch.mockResolvedValue(
        buildSearchResponse([
          buildDataSource('ds-1', 'Books'),
          buildDataSource('ds-2', 'Movies'),
        ]),
      );

      const res = await request(app.getHttpServer())
        .get('/integrations/notion/databases')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({
        databases: [
          { id: 'ds-1', title: 'Books' },
          { id: 'ds-2', title: 'Movies' },
        ],
      });
    });

    it('1-2: 異常系 - Notion未連携 → 401（SDK呼ばれない）', async () => {
      // NotionIntegration を作らない状態で叩く。
      await request(app.getHttpServer())
        .get('/integrations/notion/databases')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.UNAUTHORIZED);

      // SDK の search にはたどり着いていない
      expect(mockSearch).not.toHaveBeenCalled();
    });
  });

  describe('GET /integrations/notion/databases/:id/columns', () => {
    it('2-1: 正常系 → 200、Mapper通過後の columns 配列が返る', async () => {
      await seedNotionIntegration();
      mockDataSourcesRetrieve.mockResolvedValue(
        buildDataSource('ds-1', 'Books', {
          properties: {
            Name: { id: 'a', name: 'Name', type: 'title' },
            Body: { id: 'b', name: 'Body', type: 'rich_text' },
            Done: { id: 'c', name: 'Done', type: 'checkbox' },
          } as never,
        }),
      );

      const res = await request(app.getHttpServer())
        .get('/integrations/notion/databases/ds-1/columns')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.databaseId).toBe('ds-1');
      expect(res.body.databaseTitle).toBe('Books');
      // JSON のキー順は保証されないので arrayContaining で比較
      expect(res.body.columns).toEqual(
        expect.arrayContaining([
          { name: 'Name', type: 'title' },
          { name: 'Body', type: 'rich_text' },
          { name: 'Done', type: 'checkbox' },
        ]),
      );
    });

    it('2-2: 異常系 - Notion未連携 → 401（SDK呼ばれない）', async () => {
      await request(app.getHttpServer())
        .get('/integrations/notion/databases/ds-1/columns')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockDataSourcesRetrieve).not.toHaveBeenCalled();
    });

    it('2-3: 異常系 - Notion応答が isFullDataSource を通らない → 502', async () => {
      // mapper にたどり着く前に APIClient の型ガードで弾かれ502
      await seedNotionIntegration();
      mockDataSourcesRetrieve.mockResolvedValue({
        id: 'ds-1', // 通らないデータ
      });

      await request(app.getHttpServer())
        .get('/integrations/notion/databases/ds-1/columns')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.BAD_GATEWAY);
    });
  });

  describe('POST /integrations/notion/databases/:id/import', () => {
    /** title プロパティ + 指定カラム(rich_text) を持つ page を作る */
    const buildNotePage = (
      id: string,
      title: string,
      bodyText: string,
      bodyColumn = 'Body',
    ) =>
      buildPage(id, {
        Name: {
          id: 'a',
          type: 'title',
          title: [{ plain_text: title }],
        },
        [bodyColumn]: {
          id: 'b',
          type: 'rich_text',
          rich_text: [{ plain_text: bodyText }],
        },
      });

    it('3-1: 正常系 → 201、card 行が DB に挿入される（type=NOTE、name/content 一致）', async () => {
      await seedNotionIntegration();
      // 1回で has_more=false にして 3件返す（ページネーション挙動は APIClient 単体で担保済）
      mockDataSourcesQuery.mockResolvedValue(
        buildQueryResponse([
          buildNotePage('p1', 'Title-1', 'Body-1'),
          buildNotePage('p2', 'Title-2', 'Body-2'),
          buildNotePage('p3', 'Title-3', 'Body-3'),
        ]),
      );

      const res = await request(app.getHttpServer())
        .post('/integrations/notion/databases/ds-1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ deckId: myDeckId.toString(), columnName: 'Body' })
        .expect(HttpStatus.CREATED);

      expect(res.body.count).toBe(3);
      // truncated は false のとき省略仕様
      expect(res.body.truncated).toBeUndefined();

      // DB 検証: 自分の deck に 3件、type=NOTE、name/content が Notion ページと一致
      const cards = await prisma.card.findMany({
        where: { deckId: myDeckId },
        orderBy: { name: 'asc' },
      });
      expect(cards).toHaveLength(3);
      expect(
        cards.map((c) => ({ name: c.name, type: c.type, content: c.content })),
      ).toEqual([
        { name: 'Title-1', type: CardType.NOTE, content: 'Body-1' },
        { name: 'Title-2', type: CardType.NOTE, content: 'Body-2' },
        { name: 'Title-3', type: CardType.NOTE, content: 'Body-3' },
      ]);
    });

    it('3-2: 異常系 - 他人 deck を指定 → 404、card 変動なし', async () => {
      await seedNotionIntegration();
      // Notion 呼び出しは認可チェック前に走るので stub 必要
      mockDataSourcesQuery.mockResolvedValue(
        buildQueryResponse([buildNotePage('p1', 'T', 'B')]),
      );

      await request(app.getHttpServer())
        .post('/integrations/notion/databases/ds-1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ deckId: otherDeckId.toString(), columnName: 'Body' })
        .expect(HttpStatus.NOT_FOUND);

      // 他人 deck にも自分 deck にも card は1件も入っていない
      expect(await prisma.card.count({ where: { deckId: myDeckId } })).toBe(0);
      expect(await prisma.card.count({ where: { deckId: otherDeckId } })).toBe(
        0,
      );
    });

    it('3-3: 異常系 - Notion API 途中失敗（2ページ目で 5xx）→ 502、card 変動なし', async () => {
      await seedNotionIntegration();
      // 1ページ目: 100件 + has_more=true で 2ページ目を要求
      const firstPage = Array.from({ length: 100 }, (_, i) =>
        buildNotePage(`p${i}`, `T-${i}`, `B-${i}`),
      );
      mockDataSourcesQuery
        .mockResolvedValueOnce(buildQueryResponse(firstPage, true, 'c1'))
        // 2ページ目: Notion 5xx
        .mockRejectedValueOnce(buildServerError());

      await request(app.getHttpServer())
        .post('/integrations/notion/databases/ds-1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ deckId: myDeckId.toString(), columnName: 'Body' })
        .expect(HttpStatus.BAD_GATEWAY);

      // createManyNote まで到達していないので card は0件
      expect(await prisma.card.count({ where: { deckId: myDeckId } })).toBe(0);
    });

    it('3-4: 異常系 - Mapper 途中失敗（select 型カラム混入）→ 400、card 変動なし', async () => {
      await seedNotionIntegration();
      // 1件目は正常、2件目で columnName が select 型 → 対応外で例外
      mockDataSourcesQuery.mockResolvedValue(
        buildQueryResponse([
          buildNotePage('p1', 'OK', 'OK-body'),
          buildPage('p2', {
            Name: {
              id: 'a',
              type: 'title',
              title: [{ plain_text: 'NG' }],
            },
            Body: {
              // 対応外: title / rich_text 以外
              id: 'b',
              type: 'select',
              select: { id: 's', name: 'option', color: 'blue' },
            },
          }),
        ]),
      );

      await request(app.getHttpServer())
        .post('/integrations/notion/databases/ds-1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ deckId: myDeckId.toString(), columnName: 'Body' })
        .expect(HttpStatus.BAD_REQUEST);

      // mapper が途中で投げるので createManyNote まで届かない → card は0件
      expect(await prisma.card.count({ where: { deckId: myDeckId } })).toBe(0);
    });
  });
});
