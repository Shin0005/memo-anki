import { BadGatewayException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { NotionIntegrationRepository } from './notion-integration.repository';
import { getEnv } from '../../common/functions/get-env';
import {
  Client,
  APIResponseError,
  type OauthTokenResponse,
} from '@notionhq/client';

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
    const notion = new Client();

    let response: OauthTokenResponse;
    try {
      response = await notion.oauth.token({
        grant_type: 'authorization_code', // Notionに認可codeだと知らせる
        code,
        redirect_uri: getEnv('NOTION_REDIRECT_URI'),
        client_id: getEnv('NOTION_CLIENT_ID'),
        client_secret: getEnv('NOTION_CLIENT_SECRET'),
      });
    } catch (e) {
      // APIResponseError: Notion 側 4xx/5xx ／ それ以外: 通信系
      if (e instanceof APIResponseError) {
        throw new BadGatewayException('Notion連携に失敗しました。', {
          cause: e,
        });
      }
      throw new BadGatewayException('Notionへの接続に失敗しました。', {
        cause: e,
      });
    }
    // resがnullableなのでチェック
    if (!response.refresh_token || !response.workspace_name) {
      throw new BadGatewayException('Notionからのレスポンスが不正です。');
    }

    // NotionTokenResponseを返す
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      workspace_id: response.workspace_id,
      workspace_name: response.workspace_name,
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
