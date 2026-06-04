/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { APIResponseError, RequestTimeoutError } from '@notionhq/client';
import type {
  DataSourceObjectResponse,
  PageObjectResponse,
  QueryDataSourceResponse,
  SearchResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { NotionApiClient } from './notion-api.client';
import { NotionIntegrationRepository } from '../notion-integration.repository';
import { NotionOAuthService } from '../oauth/notion-oauth.service';
import {
  NotionReauthRequiredException,
  NotionRetryableException,
  NotionServerErrorException,
  NotionUserActionException,
} from '../notion.exceptions';

/**
 * @notionhq/client のモック
 *  - Client は class として差し替え
 *  - APIResponseError / isFullDataSource / isFullPage / iteratePaginatedAPI は実物を残す
 *    （instanceof 判定や Iterator 動作は本物が必要だから）
 */
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
    Client: class {
      search = mockSearch;
      dataSources = {
        retrieve: mockDataSourcesRetrieve,
        query: mockDataSourcesQuery,
      };
    },
  };
});

/**
 * isFullDataSource を通過する最小限の DataSourceObjectResponse を作る
 * 必要な識別フィールドだけ埋め、残りは Partial キャストで省略する仕様
 */
const buildDataSource = (
  id: string,
  overrides: Partial<DataSourceObjectResponse> = {},
): DataSourceObjectResponse =>
  ({
    object: 'data_source',
    id,
    title: [],
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

/** isFullPage を通過する最小限の PageObjectResponse を作る */
const buildPage = (id: string): PageObjectResponse =>
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
    properties: {},
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

/** 401 APIResponseError を作る */
const buildUnauthorizedError = () =>
  new APIResponseError({
    code: 'unauthorized' as never,
    status: 401,
    message: 'unauthorized',
    headers: new Headers(),
    rawBodyText: '{}',
    additional_data: undefined,
    request_id: undefined,
  });

/** 任意 code の APIResponseError を作る（toNotionException の分類検証用） */
const buildApiError = (code: string, status: number) =>
  new APIResponseError({
    code: code as never,
    status,
    message: code,
    headers: new Headers(),
    rawBodyText: '{}',
    additional_data: undefined,
    request_id: undefined,
  });

// NotionApiClient
describe('NotionApiClient', () => {
  let client: NotionApiClient;
  let repoMock: DeepMockProxy<NotionIntegrationRepository>;
  let oauthMock: DeepMockProxy<NotionOAuthService>;

  beforeEach(async () => {
    repoMock = mockDeep<NotionIntegrationRepository>();
    oauthMock = mockDeep<NotionOAuthService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionApiClient,
        { provide: NotionIntegrationRepository, useValue: repoMock },
        { provide: NotionOAuthService, useValue: oauthMock },
      ],
    }).compile();

    client = module.get<NotionApiClient>(NotionApiClient);

    // hoisted した Client モックは全テスト共有なので毎回リセットする
    mockSearch.mockReset();
    mockDataSourcesRetrieve.mockReset();
    mockDataSourcesQuery.mockReset();

    // デフォルト: AT/RT が取れる状態にしておく（個別テストで上書き可）
    repoMock.findDecryptedByUserId.mockResolvedValue({
      accessToken: 'AT',
      refreshToken: 'RT',
      workspaceId: 'ws',
      workspaceName: 'name',
    });
  });

  /** queryDatabaseAll（ページネーション・打ち切りロジックは固有ロジックなので単体で担保） */
  describe('queryDatabaseAll', () => {
    it('正常系: 単発ページ (has_more=false) なら 1 回呼んで終わる', async () => {
      const pages = [buildPage('p1'), buildPage('p2')];
      mockDataSourcesQuery.mockResolvedValue(buildQueryResponse(pages));

      const result = await client.queryDatabaseAll('user-1', 'ds-1');

      expect(result.pages.map((p) => p.id)).toEqual(['p1', 'p2']);
      expect(result.truncated).toBe(false);
      expect(mockDataSourcesQuery).toHaveBeenCalledTimes(1);
    });

    it('正常系: has_more=true なら next_cursor で 2 回目を呼んで結合する', async () => {
      // 1ページ目: 100件 + has_more=true + next_cursor='c1'
      const firstPage = Array.from({ length: 100 }, (_, i) =>
        buildPage(`p${i}`),
      );
      // 2ページ目: 残り 50件 + has_more=false
      const secondPage = Array.from({ length: 50 }, (_, i) =>
        buildPage(`p${100 + i}`),
      );
      mockDataSourcesQuery
        .mockResolvedValueOnce(buildQueryResponse(firstPage, true, 'c1'))
        .mockResolvedValueOnce(buildQueryResponse(secondPage));

      const result = await client.queryDatabaseAll('user-1', 'ds-1');

      expect(result.pages).toHaveLength(150);
      expect(result.truncated).toBe(false);
      expect(mockDataSourcesQuery).toHaveBeenCalledTimes(2);

      // 2 回目の呼び出しに start_cursor='c1' が渡っているか
      const secondCall = mockDataSourcesQuery.mock.calls[1][0] as {
        start_cursor?: string;
      };
      expect(secondCall.start_cursor).toBe('c1');
    });

    it('正常系: 1000件で打ち切り、truncated=true を返す', async () => {
      // 1〜10ページ目: 各100件、最後の page で has_more=true をセット
      for (let i = 0; i < 10; i++) {
        const pageItems = Array.from({ length: 100 }, (_, j) =>
          buildPage(`p${i * 100 + j}`),
        );
        // 10ページ目（i=9）でも has_more=true にして、打ち切りトリガーを確認
        mockDataSourcesQuery.mockResolvedValueOnce(
          buildQueryResponse(pageItems, true, `c${i + 1}`),
        );
      }

      const result = await client.queryDatabaseAll('user-1', 'ds-1');

      expect(result.pages).toHaveLength(1000);
      expect(result.truncated).toBe(true);
    });

    // 「full page でない item（partial）が isFullPage で除外される」は SDK の型ガード
    // 挙動そのものなので、結合テストで担保する。
  });

  // withRetry
  describe('withRetry: 401 → refresh → retry', () => {
    it('正常系: 401 → refresh 成功 → 2回目で成功', async () => {
      // 初回 401 → 2回目で成功させる
      mockSearch
        .mockRejectedValueOnce(buildUnauthorizedError())
        .mockResolvedValueOnce(buildSearchResponse([buildDataSource('ds-1')]));

      // refresh 成功
      oauthMock.refreshTokens.mockResolvedValue({
        access_token: 'AT-new',
        refresh_token: 'RT-new',
        workspace_id: 'ws',
        workspace_name: 'name',
      });

      const result = await client.searchDatabases('user-1');

      expect(result).toHaveLength(1);
      expect(oauthMock.refreshTokens).toHaveBeenCalledWith('RT');
      expect(oauthMock.saveNotionResponse).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });

    it('異常系: refresh 後も 401 → NotionReauthRequiredException', async () => {
      mockSearch
        .mockRejectedValueOnce(buildUnauthorizedError())
        .mockRejectedValueOnce(buildUnauthorizedError());

      oauthMock.refreshTokens.mockResolvedValue({
        access_token: 'AT-new',
        refresh_token: 'RT-new',
        workspace_id: 'ws',
        workspace_name: 'name',
      });

      await expect(client.searchDatabases('user-1')).rejects.toBeInstanceOf(
        NotionReauthRequiredException,
      );
    });

    it('異常系: refresh 自体が RT 拒否 → repository.delete + NotionReauthRequiredException', async () => {
      mockSearch.mockRejectedValueOnce(buildUnauthorizedError());

      // refresh は NotionReauthRequiredException を投げる (RT 拒否)
      oauthMock.refreshTokens.mockRejectedValue(
        new NotionReauthRequiredException('RT rejected'),
      );

      await expect(client.searchDatabases('user-1')).rejects.toBeInstanceOf(
        NotionReauthRequiredException,
      );

      // integration が削除されたこと
      expect(repoMock.delete).toHaveBeenCalledWith('user-1');
    });
  });

  describe('withRetry: handleFetchError による分類の確認', () => {
    // 再試行できる例外
    // 5xx 系と RequestTimeoutError は「Notion 側の一時障害」扱いとして同じ区分にまとまる
    it.each([
      ['internal_server_error', 500],
      ['service_unavailable', 503],
      ['gateway_timeout', 504],
      ['rate_limited', 429],
    ])(
      '異常系: %s (%d) → NotionRetryableException (sdkCode=%s)',
      async (code, status) => {
        mockSearch.mockRejectedValue(buildApiError(code, status));

        const error: unknown = await client
          .searchDatabases('user-1')
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(NotionRetryableException);
        // sdkCode が SDK の code をそのまま保持していること（ログ追跡用）
        expect((error as NotionRetryableException).sdkCode).toBe(code);
      },
    );

    it('異常系: RequestTimeoutError → NotionRetryableException (sdkCode=request_timeout)', async () => {
      mockSearch.mockRejectedValue(new RequestTimeoutError('timeout'));

      const error: unknown = await client
        .searchDatabases('user-1')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotionRetryableException);
      expect((error as NotionRetryableException).sdkCode).toBe(
        'request_timeout',
      );
    });

    // ユーザ操作起因の例外
    // ユーザが Notion 側で共有解除/削除した場合などはこちらに分類される
    it.each([
      ['restricted_resource', 403],
      ['object_not_found', 404],
    ])(
      '異常系: %s (%d) → NotionUserActionException (sdkCode=%s)',
      async (code, status) => {
        mockSearch.mockRejectedValue(buildApiError(code, status));

        const error: unknown = await client
          .searchDatabases('user-1')
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(NotionUserActionException);
        expect((error as NotionUserActionException).sdkCode).toBe(code);
      },
    );

    // サーバエラー例外
    // validation_error 等の「組み立てミス」と、SDK 外の予期しない例外
    it('異常系: validation_error → NotionServerErrorException (sdkCode=validation_error)', async () => {
      mockSearch.mockRejectedValue(buildApiError('validation_error', 400));

      const error: unknown = await client
        .searchDatabases('user-1')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotionServerErrorException);
      expect((error as NotionServerErrorException).sdkCode).toBe(
        'validation_error',
      );
    });

    it('異常系: SDK外の予期しない例外 → NotionServerErrorException (sdkCode=unknown)', async () => {
      mockSearch.mockRejectedValue(new Error('boom'));

      const error: unknown = await client
        .searchDatabases('user-1')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotionServerErrorException);
      expect((error as NotionServerErrorException).sdkCode).toBe('unknown');
    });

    it('異常系: integration が見つからない → UnauthorizedException', async () => {
      repoMock.findDecryptedByUserId.mockResolvedValue(null);

      await expect(client.searchDatabases('user-1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
