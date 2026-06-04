import {
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  APIErrorCode,
  APIResponseError,
  Client,
  RequestTimeoutError,
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
import {
  NotionReauthRequiredException,
  NotionServerErrorException,
  NotionRetryableException,
  NotionUserActionException,
} from '../notion.exceptions';

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
      // SDK側のバグ
      throw new NotionServerErrorException('not_full_data_source');
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
            // Refreshしても AT/RTが無効な場合
            e2 instanceof APIResponseError &&
            e2.code === APIErrorCode.Unauthorized
          ) {
            // 再連携が必要なケース。filterで識別してフロントにcodeを返す
            throw new NotionReauthRequiredException();
          }
          // UNAUTHORIZED以外のエラーをハンドル（refresh後）
          this.handleFetchError(e2);
        }
      }
      // UNAUTHORIZED以外のエラーをハンドル（初回）
      this.handleFetchError(e);
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
   * fetchWithRetry で発生した NotionReauthRequiredException 以外の例外を分類して投げる
   */
  private handleFetchError(e: unknown): never {
    // 普通のhttpExはglobalFilterに丸投げ
    if (e instanceof HttpException) throw e;

    // 通信タイムアウト → ユーザに再試行させる
    if (e instanceof RequestTimeoutError) {
      throw new NotionRetryableException('request_timeout');
    }
    // Notion SDK の例外を3区分（再試行 / ユーザ操作 / サーバエラー）の
    // 自前例外に分類する。詳細な SDK コードは sdkCode に格納してログで利用する
    if (e instanceof APIResponseError) {
      switch (e.code) {
        // 再試行で解決する可能性のあるエラー
        case APIErrorCode.RateLimited:
        case APIErrorCode.InternalServerError:
        case APIErrorCode.ServiceUnavailable:
        case APIErrorCode.GatewayTimeout:
          throw new NotionRetryableException(e.code);

        // ユーザ側の設定起因（権限なし／対象が存在しない）
        case APIErrorCode.RestrictedResource:
        case APIErrorCode.ObjectNotFound:
          throw new NotionUserActionException(e.code);

        // それ以外はこちらのバグなのでサーバエラー扱い
        default:
          throw new NotionServerErrorException(e.code);
      }
    }

    // SDK 外の例外（ネットワーク切断・UnknownHTTPResponseError 等）
    throw new NotionServerErrorException('unknown');
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
        // body の code='NOTION_REAUTH_REQUIRED' を見たフロントが
        // 連携解除ボタン→連携ボタンに状態を戻し、トーストを出す。
        throw new NotionReauthRequiredException(
          'Notion連携が無効になりました。再連携してください。',
        );
      }
      throw e;
    }
  }
}
