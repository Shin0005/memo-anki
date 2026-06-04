import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Notion 連携専用の例外の基底クラス
 *
 * - これを継承した例外は NotionApiExceptionFilter がまとめて catch する。
 * - `sdkCode` は SDK のエラーコード（rate_limited 等）または独自タグ（reauth_required 等）。
 *   フロントには返さず、サーバ側ログの分類用にのみ使う。
 */
export abstract class NotionException extends HttpException {
  abstract readonly sdkCode: string;
  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }
}

/**
 * Notion DB のカラムとしてユーザが選択した column が、
 * 本文化できない type (checkbox / select / date 等) だった場合の例外。
 *
 * 本来フロント側で title / rich_text のみに絞ってから送る想定だが、
 * フィルタ漏れの保険としてサーバ側でも投げる。
 */
export class NotionUnsupportedColumnException extends NotionException {
  readonly sdkCode = 'unsupported_column';
  constructor(columnName: string, type: string) {
    super(
      `このカラム (${columnName}, type=${type}) は対応外です。title または rich_text のカラムを選択してください。`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** Notion連携が無効になり、ユーザに再連携を要求する必要がある場合の例外 */
export class NotionReauthRequiredException extends NotionException {
  readonly sdkCode = 'reauth_required';
  constructor(message = 'Notion連携が無効です。再連携してください。') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

// SDKから出る例外
/**
 * 再試行で解決する可能性がある一時的なエラー。
 * 例: rate_limited / internal_server_error / service_unavailable / gateway_timeout / RequestTimeout
 *
 * フロントには 503 と定型メッセージを返す。
 */
export class NotionRetryableException extends NotionException {
  constructor(readonly sdkCode: string) {
    super(
      '一時的な障害が発生しました。時間をおいて再度お試しください。',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * ユーザ側の設定問題に起因するエラー。
 * 例: restricted_resource / object_not_found（DB を共有していない・削除した等）
 *
 * フロントには 400 と「連携設定を確認してください」を返す。
 */
export class NotionUserActionException extends NotionException {
  constructor(readonly sdkCode: string) {
    super('Notionとの連携設定を確認してください。', HttpStatus.BAD_REQUEST);
  }
}

/**
 * こちら側のバグ・想定外を示すエラー。
 * 例: validation_error / invalid_json / invalid_request / SDK 以外の例外
 *
 * フロントには 500 と汎用メッセージを返し、サーバ側はスタックトレース付きで error ログを残す。
 */
export class NotionServerErrorException extends NotionException {
  constructor(readonly sdkCode: string) {
    super('システムエラーが発生しました。', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
