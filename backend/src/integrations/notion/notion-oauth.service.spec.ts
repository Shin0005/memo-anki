/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from 'vitest';
import { BadGatewayException } from '@nestjs/common';
import type { NotionIntegration } from '@prisma/client';

import { NotionOAuthService } from './notion-oauth.service';
import { NotionIntegrationRepository } from './notion-integration.repository';

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
    vi.clearAllMocks();
  });

  afterEach(() => {
    // fetch を都度 mock するため、各テスト後に必ず元へ戻す
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // exchangeCodeForTokens
  // ---------------------------------------------------------------------------
  describe('exchangeCodeForTokens', () => {
    /**
     * Notion の token エンドポイントの 200 レスポンスを模した body を返す
     * fetch 全体の mock を仕込むユーティリティ
     */
    const mockFetchJson = (status: number, body: unknown) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: () => body,
      });
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };

    it('正常系: 200で必要項目が揃ったレスポンス → 4項目だけ抽出して返すこと', async () => {
      // Notion が返す余分なフィールド (workspace_icon 等) は捨てる仕様
      mockFetchJson(200, {
        access_token: 'AT-xxx',
        refresh_token: 'RT-xxx',
        workspace_id: 'ws-1',
        workspace_name: 'My Workspace',
        workspace_icon: 'should-be-ignored',
        bot_id: 'should-be-ignored',
        token_type: 'bearer',
      });

      const result = await service.exchangeCodeForTokens('dummy-code');

      // 抽出された 4 項目のみ含まれること
      expect(result).toEqual({
        access_token: 'AT-xxx',
        refresh_token: 'RT-xxx',
        workspace_id: 'ws-1',
        workspace_name: 'My Workspace',
      });
    });

    it('呼び出し検証: URL / Basic認証ヘッダ / body が仕様通りであること', async () => {
      const fetchMock = mockFetchJson(200, {
        access_token: 'AT',
        refresh_token: 'RT',
        workspace_id: 'ws',
        workspace_name: 'name',
      });

      await service.exchangeCodeForTokens('code-123');

      // base64(<client_id>:<client_secret>) を組み立てて比較
      const expectedBasic = Buffer.from(
        'test-client-id:test-client-secret',
      ).toString('base64');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

      // URL
      expect(url).toBe('https://api.notion.com/v1/oauth/token');
      // method
      expect(init.method).toBe('POST');
      // headers
      expect(init.headers).toMatchObject({
        Authorization: `Basic ${expectedBasic}`,
        'Content-Type': 'application/json',
      });
      // body は JSON 文字列で、grant_type / code / redirect_uri が乗ること
      expect(JSON.parse(init.body as string)).toEqual({
        grant_type: 'authorization_code',
        code: 'code-123',
        redirect_uri: 'http://localhost:3001/api/integrations/notion/callback',
      });
    });

    it('異常系: fetch 自体が throw → BadGatewayException', async () => {
      // ネットワーク断などで fetch が rejected promise を返すケース
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('network down')),
      );

      await expect(
        service.exchangeCodeForTokens('code'),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('異常系: response.ok=false (4xx/5xx) → BadGatewayException', async () => {
      mockFetchJson(400, { error: 'invalid_grant' });

      await expect(
        service.exchangeCodeForTokens('code'),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    // 必須項目欠落のパターンを it.each で網羅
    it.each([
      [
        'access_token 欠落',
        { refresh_token: 'r', workspace_id: 'w', workspace_name: 'n' },
      ],
      [
        'refresh_token 欠落',
        { access_token: 'a', workspace_id: 'w', workspace_name: 'n' },
      ],
      [
        'workspace_id 欠落',
        { access_token: 'a', refresh_token: 'r', workspace_name: 'n' },
      ],
      [
        'workspace_name 欠落',
        { access_token: 'a', refresh_token: 'r', workspace_id: 'w' },
      ],
    ])(
      '異常系: 必須項目欠落 (%s) → BadGatewayException',
      async (_label, body) => {
        // [試験項目: exchange レスポンス必須項目欠落]
        mockFetchJson(200, body);

        await expect(
          service.exchangeCodeForTokens('code'),
        ).rejects.toBeInstanceOf(BadGatewayException);
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
