import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Notion 連携専用の例外の基底クラス
 * これをcatchするのはNotionApiExceptionFilter
 */
export abstract class NotionException extends HttpException {
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
  constructor(columnName: string, type: string) {
    super(
      `このカラム (${columnName}, type=${type}) は対応外です。title または rich_text のカラムを選択してください。`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** Notion連携が無効になり、ユーザに再連携を要求する必要がある場合の例外 */
export class NotionReauthRequiredException extends NotionException {
  constructor(message = 'Notion連携が無効です。再連携してください。') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
