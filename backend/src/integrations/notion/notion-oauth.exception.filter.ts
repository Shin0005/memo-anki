import {
  ArgumentsHost,
  BadGatewayException,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  COOKIE_OAUTH_DECK_ID,
  clearOAuthCookies,
} from './notion-oauth.cookies';

@Catch(BadRequestException, BadGatewayException)
export class NotionOAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NotionOAuthExceptionFilter.name);

  catch(
    exception: BadRequestException | BadGatewayException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const res: Response = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const cookies = req.cookies as Record<string, string | undefined>;
    const deckId = cookies[COOKIE_OAUTH_DECK_ID] ?? '/decks';

    // BADREQUESTに関してはクライアント由来であり調査の必要性が薄い。
    if (exception instanceof BadGatewayException) {
      this.logger.error(exception.message, exception.stack);
      // cause walk: SDK元エラー（APIResponseError等）も出す
      const cause = (exception as Error).cause;
      if (cause instanceof Error) {
        this.logger.error(`Caused by: ${cause.message}`, cause.stack);
      }
    } else {
      this.logger.warn(exception.message);
    }

    // cookieを破棄
    clearOAuthCookies(res);

    // notionからのリクエストから発生したエラーはフロントに返す必要がない。
    // つまりサーバー内部エラーであるためメッセージは返さずフラグで失敗かどうかの判断をさせる。
    const code =
      exception instanceof BadGatewayException
        ? 'notion_failed'
        : 'notion_invalid';
    return res.redirect(
      `${process.env.FRONTEND_URL}/decks/${deckId}?integration=${code}`,
    );
  }
}
