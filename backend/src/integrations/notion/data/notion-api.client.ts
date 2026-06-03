import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullDataSource,
  isFullPage,
  iteratePaginatedAPI,
} from '@notionhq/client';
import type {
  DataSourceObjectResponse,
  PageObjectResponse,
  QueryDataSourceParameters,
  QueryDataSourceResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { NotionIntegrationRepository } from '../notion-integration.repository';
import { NotionOAuthService } from '../oauth/notion-oauth.service';
import { NotionReauthRequiredException } from '../notion.exceptions';

/**
 * Notion API クライアント（SDK ラッパー）
 *
 * 本プロジェクトでは、1 database = 1 data_source を前提とし、
 * 上位レイヤから渡される databaseId は data_source_id として扱う。
 */
@Injectable()
export class NotionApiClient {
  private readonly logger = new Logger(NotionApiClient.name);

  // 巨大DB対策: 上限到達で打ち切りtruncated=true を返す
  private static readonly NOTES_LIMIT = 1000;
  private static readonly PAGE_SIZE = 100;

  constructor(
    private readonly repository: NotionIntegrationRepository,
    private readonly oauthService: NotionOAuthService,
  ) {}

  /** userがshareしたdata_source（DB）一覧を取得する */
  async searchDatabases(userId: string): Promise<DataSourceObjectResponse[]> {
    const res = await this.fetchWithRetry(userId, (client) =>
      // searchの結果には、objectプロパティの要素としてuserやdata_source、pageなどが含まれる
      // 今回欲しいのはdbなので余計なものを取得しないように制限
      client.search({
        filter: { value: 'data_source', property: 'object' },
        page_size: NotionApiClient.PAGE_SIZE,
      }),
    );
    // res.resultsは型UNIONで複数の型が|で結合されている
    // そのためres.result.dbみたいにできるように型のフィルタリングしている
    return res.results.filter(isFullDataSource);
  }

  /** data_sourceの詳細カラムを取得する */
  async retrieveDatabase(
    userId: string,
    databaseId: string,
  ): Promise<DataSourceObjectResponse> {
    const res = await this.fetchWithRetry(userId, (client) =>
      client.dataSources.retrieve({ data_source_id: databaseId }),
    );
    if (!isFullDataSource(res)) {
      throw new BadGatewayException(
        'Notionからdatabaseの詳細を取得できませんでした。',
      );
    }
    // 絞り込まず全カラムを返却（ユーザに選択させる）
    return res;
  }

  /** data_sourceのpageを全件取得する。NOTES_LIMIT到達で打ち切りtruncated=trueを返す */
  async queryDatabaseAll(
    userId: string,
    databaseId: string,
  ): Promise<{ pages: PageObjectResponse[]; truncated: boolean }> {
    const pages: PageObjectResponse[] = [];
    let truncated = false;

    // iteratePaginatedAPIに渡すfetch関数を準備
    const queryWithRetry = (
      args: QueryDataSourceParameters,
    ): Promise<QueryDataSourceResponse> =>
      this.fetchWithRetry(userId, (client) => client.dataSources.query(args));

    // iteratePaginatedAPIは(fn, init)を引数として持ち、条件を満たすまで内部でcursorをループする
    for await (const item of iteratePaginatedAPI(queryWithRetry, {
      data_source_id: databaseId,
      page_size: NotionApiClient.PAGE_SIZE,
    })) {
      if (isFullPage(item)) {
        pages.push(item);
        if (pages.length >= NotionApiClient.NOTES_LIMIT) {
          truncated = true;
          break;
        }
      }
    }

    return { pages, truncated };
  }

  /**
   * リフレッシュ付きFetch関数 内部でrunWithClientを利用
   * 401 → refresh → 1回retry / その他 → 502 を集約
   */
  private async fetchWithRetry<T>(
    userId: string,
    fn: (client: Client) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.runWithClient(userId, fn);
    } catch (e) {
      if (
        // AT無効・期限切れだった場合はリトライ
        e instanceof APIResponseError &&
        e.code === APIErrorCode.Unauthorized
      ) {
        await this.refreshAccessToken(userId);
        try {
          return await this.runWithClient(userId, fn);
        } catch (e2) {
          if (
            // Notion AT/RTが無効な場合
            e2 instanceof APIResponseError &&
            e2.code === APIErrorCode.Unauthorized
          ) {
            // 再連携が必要なケース。filterで識別してフロントにcodeを返す
            throw new NotionReauthRequiredException();
          }
          // UNAUTHORIZED以外のエラーをハンドル（refresh後）
          return this.handleNonRetryableError(e2);
        }
      }
      // UNAUTHORIZED以外のエラーをハンドル（初回）
      return this.handleNonRetryableError(e);
    }
  }

  // <T>には各notionクエリの返りデータ型が入る
  /** DBからATを取り出してClientを組み立て、渡された関数fnを実行する */
  private async runWithClient<T>(
    userId: string,
    fn: (client: Client) => Promise<T>,
  ): Promise<T> {
    const tokens = await this.repository.findDecryptedByUserId(userId);
    if (!tokens) {
      // 基本的にここにたどり着く前にstatus確認でこの関数は通らない
      throw new UnauthorizedException('Notion連携が見つかりません。');
    }
    return fn(new Client({ auth: tokens.accessToken }));
  }

  /**
   * 401以外のエラーを502に正規化
   * - ネットワークエラーやタイムアウト、Notion障害、その他予期しない例外
   * - HttpExceptionはそのまま流す
   */
  private handleNonRetryableError(e: unknown): never {
    if (e instanceof HttpException) throw e; // filterに丸投げ
    if (e instanceof APIResponseError) {
      throw new BadGatewayException(
        `Notion API がエラーを返しました（status=${e.status}）。`,
      );
    }
    // 予期しないエラーまたはネットワークエラー
    this.logger.error('Notion APIへの通信が失敗しました', e);
    throw new BadGatewayException('Notion APIとの通信に失敗しました。');
  }

  /** RTを使ってAT/RTを再発行しDBを更新する。RT拒否ならintegrationを削除する */
  private async refreshAccessToken(userId: string): Promise<void> {
    const tokens = await this.repository.findDecryptedByUserId(userId);
    if (!tokens) {
      // 基本的にここにたどり着く前にstatus確認でこの関数は通らない
      throw new UnauthorizedException('Notion連携が見つかりません。');
    }
    try {
      const newTokens = await this.oauthService.refreshTokens(
        tokens.refreshToken,
      );
      await this.oauthService.saveNotionResponse(userId, newTokens);
    } catch (e) {
      // RTが存在するが拒否された場合はintegrationを消して再連携を要求する
      if (e instanceof NotionReauthRequiredException) {
        this.logger.warn(
          'Notion refreshが拒否されました。integrationを削除します。',
        );
        await this.repository.delete(userId);
        // 再連携要求はNotionApiExceptionFilterで識別され、
        // body の code フィールドでフロントが再連携モーダルを出す
        throw new NotionReauthRequiredException(
          'Notion連携が無効になりました。再連携してください。',
        );
      }
      throw e;
    }
  }
}
