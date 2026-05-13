import { BadGatewayException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { NotionIntegrationRepository } from './notion-integration.repository';
import { getEnv } from '../../common/functions/get-env';

/**
 * Notion OAuth tokenエンドポイントのレスポンス（必要項目のみ）
 *
 * Notionは workspace_icon, bot_id, owner なども返すが、本機能では保存しないため
 * ここでは扱わない。
 */
export type NotionTokenResponse = {
  access_token: string;
  refresh_token: string;
  workspace_id: string;
  workspace_name: string;
};
@Injectable()
export class NotionOAuthService {
  // Notion OAuth関連のエンドポイント
  private static readonly NOTION_AUTHORIZE_URL =
    'https://api.notion.com/v1/oauth/authorize';
  private static readonly NOTION_TOKEN_URL =
    'https://api.notion.com/v1/oauth/token';

  constructor(private readonly repository: NotionIntegrationRepository) {}

  /**
   * Notion認可画面へのリダイレクト先URLを構築する
   * @param state /authで生成しCookieに保存したstate
   */
  buildAuthorizationUrl(state: string): string {
    const url = new URL(NotionOAuthService.NOTION_AUTHORIZE_URL);
    // query
    url.searchParams.set('client_id', getEnv('NOTION_CLIENT_ID'));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('owner', 'user');
    url.searchParams.set('redirect_uri', getEnv('NOTION_REDIRECT_URI'));
    url.searchParams.set('state', state);
    return url.toString();
  }

  /**
   * 認可codeをNotionのtokenエンドポイントに投げてAT/RTを取得する
   * @param code Notionから返され認可code
   * @returns Notionから送られたtoken（保存対象のみ抽出）
   */
  async exchangeCodeForTokens(code: string): Promise<NotionTokenResponse> {
    const clientId = getEnv('NOTION_CLIENT_ID');
    const clientSecret = getEnv('NOTION_CLIENT_SECRET');
    const redirectUri = getEnv('NOTION_REDIRECT_URI');

    // Basic認証ヘッダ用のbase64文字列
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    let response: Response;
    try {
      response = await fetch(NotionOAuthService.NOTION_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code', // Notionに認可codeだと知らせる
          code,
          redirect_uri: redirectUri,
        }),
      });
    } catch (e) {
      throw new BadGatewayException(e, 'Notionとの通信に失敗しました。');
    }

    if (!response.ok) {
      // 認可エラー・期限切れ等。設計上は502相当として扱う。
      throw new BadGatewayException('Notion連携に失敗しました。');
    }

    // Notionはbearer固定だが念のため型を合わせて使う
    const body = (await response.json()) as Partial<NotionTokenResponse>;

    // 必須項目の検証（Notion側のエラー対策）
    if (
      !body.access_token ||
      !body.refresh_token ||
      !body.workspace_id ||
      !body.workspace_name
    ) {
      throw new BadGatewayException('Notionからのレスポンスが不正です。');
    }
    // NotionTokenResponseを返す
    return {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      workspace_id: body.workspace_id,
      workspace_name: body.workspace_name,
    };
  }

  /**
   * 取得したAT/RTをDBへ保存する（upsert）
   * 暗号化はrepositoryで行う。
   */
  async saveNotionResponse(userId: string, tokens: NotionTokenResponse) {
    return this.repository.upsert({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      workspaceId: tokens.workspace_id,
      workspaceName: tokens.workspace_name,
    });
  }

  /**
   * 連携状態を返す
   * - レコードが無ければ connected=false のみ
   * - 有れば connected=true と workspaceName を返す
   */
  async getStatus(userId: string): Promise<{
    connected: boolean;
    workspaceName?: string;
  }> {
    const integration = await this.repository.findByUserId(userId);
    if (!integration) {
      return { connected: false };
    }
    return {
      connected: true,
      workspaceName: integration.workspaceName,
    };
  }

  /**
   * 連携解除
   */
  async deleteIntegration(userId: string): Promise<void> {
    await this.repository.delete(userId);
  }

  /** 32バイトのランダムstateを生成する（hex 64文字）*/
  generateState(): string {
    return randomBytes(32).toString('hex');
  }
}
