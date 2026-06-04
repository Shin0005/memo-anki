import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  NotionException,
  NotionReauthRequiredException,
  NotionServerErrorException,
} from '../notion.exceptions';

/**
 * Notion APIエンドポイント用の例外フィルタ
 *
 * - NotionExceptionを一括 catch し、サブクラスごとに以下を出し分ける:
 *   - ログ severity: NotionServerErrorException のみ error（スタック付き）、他は warn
 *   - レスポンス body: 再連携要求のみ `code: 'NOTION_REAUTH_REQUIRED'` を付与する。
 *     フロントは通常 401(JWT切れ) と区別したいケースのみ code を見て、
 *     連携解除ボタン→連携ボタンへの状態遷移に使う。
 */
@Catch(NotionException)
export class NotionApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NotionApiExceptionFilter.name);

  catch(exception: NotionException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // SDK code（または独自タグ）を必ず付けてログに残す。
    const logLine = `[${exception.sdkCode}] ${exception.message} - ${req.url}`;

    // サーバ起因（こちらのバグ示唆）だけ error + stack を残す。
    if (exception instanceof NotionServerErrorException) {
      this.logger.error(logLine, exception.stack);
    } else {
      this.logger.warn(logLine);
    }

    // 再連携要求のときだけ body に code を載せる（フロントのボタン状態遷移用）
    if (exception instanceof NotionReauthRequiredException) {
      return res.status(status).json({
        statusCode: status,
        code: 'NOTION_REAUTH_REQUIRED',
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }

    // 通常の Notion 系例外
    return res.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
