/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterAll,
} from 'vitest';
import { BadGatewayException } from '@nestjs/common';
import type { NotionIntegration } from '@prisma/client';
import {
  APIResponseError,
  RequestTimeoutError,
  type OauthTokenResponse,
} from '@notionhq/client';

import { NotionOAuthService } from './notion-oauth.service';
import { NotionIntegrationRepository } from '../notion-integration.repository';
import { NotionReauthRequiredException } from '../notion.exceptions';

/**
 * @notionhq/client (Notion 公式 SDK) のモック
 * - 実 HTTP は飛ばしたいので Client.oauth.token を vi.fn() に差し替える
 * - 各テストでは mockOauthToken.mockResolvedValue / mockRejectedValue を切り替えて使う
 */
const { mockOauthToken } = vi.hoisted(() => ({
  mockOauthToken: vi.fn(),
}));

// Client は new で呼ばれるので class で差し替える。
// APIResponseError 等のエラークラスは instanceof 判定に使うので、実物を importActual で残す
vi.mock('@notionhq/client', async () => {
  const actual =
    await vi.importActual<typeof import('@notionhq/client')>(
      '@notionhq/client',
    );
  return {
    ...actual,
    Client: class {
      oauth = { token: mockOauthToken };
    },
  };
});

/**
 * NotionOAuthService の単体試験
 *
 * 試験対象
 *  - exchangeCodeForTokens
 *  - getStatus
 *  - generateState
 *  - buildAuthorizationUrl
 *
 * 試験対象外（結合で担保）
 *  - saveNotionResponse
 *  - deleteIntegration
 */
describe('NotionOAuthService', () => {
  let service: NotionOAuthService;
  let repoMock: DeepMockProxy<NotionIntegrationRepository>;

  // テスト全体で使う環境変数の差し込み・退避用
  const ORIGINAL_ENV = { ...process.env };

  // 環境変数を試験用の値で固定（buildAuthorizationUrl / exchangeCodeForTokens で使用）
  beforeAll(() => {
    process.env.NOTION_CLIENT_ID = 'test-client-id';
    process.env.NOTION_CLIENT_SECRET = 'test-client-secret';
    process.env.NOTION_REDIRECT_URI =
      'http://localhost:3001/api/integrations/notion/callback';
  });

  // 他テストへの影響を消すため、起動前の env を完全に復元する
  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  beforeEach(async () => {
    repoMock = mockDeep<NotionIntegrationRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionOAuthService,
        {
          provide: NotionIntegrationRepository,
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<NotionOAuthService>(NotionOAuthService);
    // SDK モックの実装と呼び出し履歴を毎回リセット（前テストの mockResolvedValue を引きずらない）
    mockOauthToken.mockReset();
    vi.clearAllMocks();
  });

  /**
   * SDK の OauthTokenResponse は workspace_icon / bot_id / owner / token_type 等の必須項目を
   * 多く含むが、service 側ではこれら 4 項目しか参照しないため、テストでは Partial を
   * OauthTokenResponse としてキャストして渡す。
   */
  const buildOauthResponse = (
    overrides: Partial<OauthTokenResponse>,
  ): OauthTokenResponse =>
    ({
      access_token: 'AT',
      refresh_token: 'RT',
      workspace_id: 'ws',
      workspace_name: 'name',
      ...overrides,
    }) as OauthTokenResponse;

  // ---------------------------------------------------------------------------
  // exchangeCodeForTokens
  // ---------------------------------------------------------------------------
  describe('exchangeCodeForTokens', () => {
    it('正常系: SDKが返したレスポンスから 4項目だけ抽出して返すこと', async () => {
      // SDK レスポンスには workspace_icon / bot_id 等も含まれるが service は捨てる仕様
      mockOauthToken.mockResolvedValue(
        buildOauthResponse({
          access_token: 'AT-xxx',
          refresh_token: 'RT-xxx',
          workspace_id: 'ws-1',
          workspace_name: 'My Workspace',
          workspace_icon: 'should-be-ignored',
          bot_id: 'should-be-ignored',
          token_type: 'bearer',
        }),
      );

      const result = await service.exchangeCodeForTokens('dummy-code');

      // 抽出された 4 項目のみ含まれること
      expect(result).toEqual({
        access_token: 'AT-xxx',
        refresh_token: 'RT-xxx',
        workspace_id: 'ws-1',
        workspace_name: 'My Workspace',
      });
    });

    it('呼び出し検証: oauth.token に grant_type/code/redirect_uri/client_id/client_secret が渡されること', async () => {
      // URL や Basic 認証ヘッダの組み立ては SDK 側の責務になったので、
      // service 単体テストでは「SDK に正しい引数を渡したか」のみを検証する
      mockOauthToken.mockResolvedValue(buildOauthResponse({}));

      await service.exchangeCodeForTokens('code-123');

      expect(mockOauthToken).toHaveBeenCalledTimes(1);
      expect(mockOauthToken).toHaveBeenCalledWith({
        grant_type: 'authorization_code',
        code: 'code-123',
        redirect_uri: 'http://localhost:3001/api/integrations/notion/callback',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
      });
    });

    // APIResponseError は Notion 側エラー（invalid_grant等）。service は内部用 message で投げ直す
    it('異常系: APIResponseError → BadGateway (内部用 message)', async () => {
      const apiErr = new APIResponseError({
        code: 'unauthorized' as never,
        status: 401,
        message: 'invalid_grant',
        headers: new Headers(),
        rawBodyText: '{"error":"invalid_grant"}',
        additional_data: undefined,
        request_id: undefined,
      });
      mockOauthToken.mockRejectedValue(apiErr);

      await expect(service.exchangeCodeForTokens('code')).rejects.toMatchObject(
        {
          constructor: BadGatewayException,
          message: 'Notion連携に失敗しました。',
        },
      );
    });

    // それ以外（RequestTimeoutError / network 系）は通信用 message で投げ直す
    it('異常系: RequestTimeoutError → BadGateway (通信用 message)', async () => {
      const timeoutErr = new RequestTimeoutError('request timed out');
      mockOauthToken.mockRejectedValue(timeoutErr);

      await expect(service.exchangeCodeForTokens('code')).rejects.toMatchObject(
        {
          constructor: BadGatewayException,
          message: 'Notionへの接続に失敗しました。',
        },
      );
    });

    // OauthTokenResponse 型上、refresh_token と workspace_name は nullable。
    // access_token / workspace_id は SDK 型で non-null 保証されているため runtime チェック不要
    it.each<[string, Partial<OauthTokenResponse>]>([
      ['refresh_token が null', { refresh_token: null, workspace_name: 'n' }],
      ['workspace_name が null', { refresh_token: 'r', workspace_name: null }],
    ])(
      '異常系: 必須項目欠落 (%s) → BadGatewayException',
      async (_label, partial) => {
        mockOauthToken.mockResolvedValue(buildOauthResponse(partial));

        await expect(
          service.exchangeCodeForTokens('code'),
        ).rejects.toBeInstanceOf(BadGatewayException);
      },
    );
  });

  // ---------------------------------------------------------------------------
  // refreshTokens
  // ---------------------------------------------------------------------------
  describe('refreshTokens', () => {
    it('正常系: SDKが返したレスポンスから 4項目だけ抽出して返すこと', async () => {
      // 新しいAT/RTがNotionから返るパターン
      mockOauthToken.mockResolvedValue(
        buildOauthResponse({
          access_token: 'AT-new',
          refresh_token: 'RT-new',
          workspace_id: 'ws-1',
          workspace_name: 'My Workspace',
          workspace_icon: 'should-be-ignored',
          bot_id: 'should-be-ignored',
          token_type: 'bearer',
        }),
      );

      const result = await service.refreshTokens('RT-old');

      expect(result).toEqual({
        access_token: 'AT-new',
        refresh_token: 'RT-new',
        workspace_id: 'ws-1',
        workspace_name: 'My Workspace',
      });
    });

    it('呼び出し検証: oauth.token に grant_type=refresh_token と RT/client_id/client_secret が渡されること', async () => {
      // 認可codeフローとは grant_type と refresh_token 以外が違うので、
      // 引数が正しく組み立てられているか確認する
      mockOauthToken.mockResolvedValue(buildOauthResponse({}));

      await service.refreshTokens('RT-zzz');

      expect(mockOauthToken).toHaveBeenCalledTimes(1);
      expect(mockOauthToken).toHaveBeenCalledWith({
        grant_type: 'refresh_token',
        refresh_token: 'RT-zzz',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
      });
    });

    // 4xx は RT 拒否 → ユーザに再連携を促す必要がある
    it.each<[string, number, string]>([
      ['400 invalid_grant', 400, 'invalid_grant'],
      ['401 unauthorized', 401, 'unauthorized'],
    ])(
      '異常系: %s → NotionReauthRequiredException',
      async (_label, status, code) => {
        const apiErr = new APIResponseError({
          code: code as never,
          status,
          message: code,
          headers: new Headers(),
          rawBodyText: `{"error":"${code}"}`,
          additional_data: undefined,
          request_id: undefined,
        });
        mockOauthToken.mockRejectedValue(apiErr);

        await expect(service.refreshTokens('RT')).rejects.toBeInstanceOf(
          NotionReauthRequiredException,
        );
      },
    );

    // 5xx は Notion 側障害 → 連携は維持して 502 を返す
    it('異常系: 5xx → BadGatewayException', async () => {
      const apiErr = new APIResponseError({
        code: 'internal_server_error' as never,
        status: 500,
        message: 'internal_server_error',
        headers: new Headers(),
        rawBodyText: '{}',
        additional_data: undefined,
        request_id: undefined,
      });
      mockOauthToken.mockRejectedValue(apiErr);

      await expect(service.refreshTokens('RT')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    // 通信系（RequestTimeoutError）は BadGateway
    it('異常系: RequestTimeoutError → BadGatewayException', async () => {
      const timeoutErr = new RequestTimeoutError('request timed out');
      mockOauthToken.mockRejectedValue(timeoutErr);

      await expect(service.refreshTokens('RT')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    // OauthTokenResponse は refresh_token / workspace_name が nullable
    it.each<[string, Partial<OauthTokenResponse>]>([
      ['refresh_token が null', { refresh_token: null, workspace_name: 'n' }],
      ['workspace_name が null', { refresh_token: 'r', workspace_name: null }],
    ])(
      '異常系: 必須項目欠落 (%s) → BadGatewayException',
      async (_label, partial) => {
        mockOauthToken.mockResolvedValue(buildOauthResponse(partial));

        await expect(service.refreshTokens('RT')).rejects.toBeInstanceOf(
          BadGatewayException,
        );
      },
    );
  });

  // ---------------------------------------------------------------------------
  // getStatus
  // ---------------------------------------------------------------------------
  describe('getStatus', () => {
    it('正常系: repository が null → { connected: false } のみ返ること', async () => {
      // [試験項目: status 未連携]
      repoMock.findByUserId.mockResolvedValue(null);

      const result = await service.getStatus('user-1');

      // workspaceName キーが含まれないこと
      expect(result).toEqual({ connected: false });
    });

    it('正常系: repository が integration → connected=true と workspaceName を返すこと', async () => {
      // [試験項目: status 連携済み]
      const integration: NotionIntegration = {
        id: '1',
        userId: 'user-1',
        accessTokenEnc: 'enc-at',
        refreshTokenEnc: 'enc-rt',
        workspaceId: 'ws-1',
        workspaceName: 'My Workspace',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repoMock.findByUserId.mockResolvedValue(integration);

      const result = await service.getStatus('user-1');

      expect(result).toEqual({
        connected: true,
        workspaceName: 'My Workspace',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // generateState
  // ---------------------------------------------------------------------------
  describe('generateState', () => {
    it('正常系: 64文字の hex 文字列を返すこと', () => {
      // [試験項目: state フォーマット]
      // 32バイト = 64文字hex (0-9a-f) になる
      const state = service.generateState();
      expect(state).toMatch(/^[0-9a-f]{64}$/);
    });

    it('正常系: 連続呼び出しで重複しないこと（ランダム性）', () => {
      // [試験項目: state ランダム性]
      // 10回呼び出してすべて異なる値であること
      const states = new Set<string>();
      for (let i = 0; i < 10; i++) {
        states.add(service.generateState());
      }
      expect(states.size).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // buildAuthorizationUrl
  // ---------------------------------------------------------------------------
  describe('buildAuthorizationUrl', () => {
    it('正常系: Notion認可URLのベースと、必須5パラメータが揃うこと', () => {
      const url = new URL(service.buildAuthorizationUrl('STATE-VALUE'));

      // ベースURL
      expect(url.origin + url.pathname).toBe(
        'https://api.notion.com/v1/oauth/authorize',
      );

      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('owner')).toBe('user');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3001/api/integrations/notion/callback',
      );
      expect(url.searchParams.get('state')).toBe('STATE-VALUE');
    });

    it('正常系: state 値が URL エンコードされて埋め込まれること', () => {
      // URL クラスは自動でエンコードするが、searchParams.get() は復号後の生値を返す。
      // & や = を含む値でもクエリが壊れないことを確認する。
      const raw = 'a b&c=d';
      const urlString = service.buildAuthorizationUrl(raw);
      const url = new URL(urlString);

      // 復号後は元の値と一致する（=往復可能）
      expect(url.searchParams.get('state')).toBe(raw);
      // 生URLでは予約文字が素のまま現れていない（クエリパラメータを分断しない）
      expect(urlString).not.toContain('state=a b&c=d');
    });
  });
});
