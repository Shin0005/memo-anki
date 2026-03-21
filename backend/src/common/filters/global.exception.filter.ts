import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    // 自分が設定するレスポンス
    const response: Response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Http系の汎用例外（DomainExも含む）
    if (exception instanceof HttpException) {
      this.logger.warn(exception.message);

      return response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
