import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { NotionReauthRequiredException } from './notion.exceptions';

/**
 * Notion APIエンドポイント用の例外フィルタ
 *
 * フロント側で JWT 期限切れ等の通常 401 と区別する必要があるため、
 *  再連携要求にだけ専用 `code` を載せて返す。
 */
@Catch(NotionReauthRequiredException)
export class NotionApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NotionApiExceptionFilter.name);

  catch(exception: NotionReauthRequiredException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // ユーザ操作起因の業務エラー想定。スタックトレースまでは要らないので warn。
    this.logger.warn(`${exception.message} - Path: ${req.url}`);

    // 再連携要求: フロントが他の 401 と区別できるよう専用 code を載せる
    return res.status(status).json({
      statusCode: status,
      code: 'NOTION_REAUTH_REQUIRED',
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
