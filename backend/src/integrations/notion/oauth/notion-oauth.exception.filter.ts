import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  NotionException,
  NotionOAuthInternalException,
  NotionOAuthInvalidRequestException,
} from '../notion.exceptions';
import {
  COOKIE_OAUTH_DECK_ID,
  clearOAuthCookies,
} from './notion-oauth.cookies';

/**
 * Notion OAuth callback 用の例外フィルタ
 *
 * - OAuth 専用の独自例外（NotionException 派生）を catch し、フロントへリダイレクトで返す。
 * - data 側 (NotionApiExceptionFilter) が JSON を返すのと異なり、callback はブラウザ遷移なので
 *   notion_invalid / notion_failed のフラグを query に載せて redirect する。
 * - notion_failed / notion_invalid の振り分けは instanceof で行い、例外クラス自身には持たせない。
 */
@Catch(NotionOAuthInvalidRequestException, NotionOAuthInternalException)
export class NotionOAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NotionOAuthExceptionFilter.name);

  catch(exception: NotionException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res: Response = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const cookies = req.cookies as Record<string, string | undefined>;
    const deckId = cookies[COOKIE_OAUTH_DECK_ID] ?? '/decks';

    // SDK code（または独自タグ）を必ず付けてログに残す。
    const logLine = `[${exception.sdkCode}] ${exception.message} - ${req.url}`;

    // Notion / 内部ロジック起因（upstream）だけ error + stack を残す。
    // クライアント起因（invalid）は調査の必要性が薄いので warn。
    const isInternalException =
      exception instanceof NotionOAuthInternalException;
    if (isInternalException) {
      this.logger.error(logLine, exception.stack);
    } else {
      this.logger.warn(logLine);
    }

    // cookieを破棄（再利用防止）
    clearOAuthCookies(res);

    // notionからのリクエストから発生したエラーはフロントに返す必要がない。
    // つまりサーバー内部エラーであるためメッセージは返さずフラグで失敗かどうかの判断をさせる。
    const code = isInternalException ? 'notion_failed' : 'notion_invalid';
    return res.redirect(
      `${process.env.FRONTEND_URL}/decks/${deckId}?integration=${code}`,
    );
  }
}
