import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginFailedException } from '../exceptions/domain.exceptions';
import { ValidationFailedException } from '../exceptions/application.exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // （時間があればWinstonやPinoで出力したい）
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    /*
      validation例外（pipeでthrow）
    */
    if (exception instanceof ValidationFailedException) {
      this.logger.warn(`${exception.message} - Path: ${request.url}`);

      // Json例） "errors":[{password: '8文字以上で入力してください'}, ... ,{...}]
      const details = exception.validationErrors.map((err) => ({
        field: err.property,
        message: Object.values(err.constraints || {})[0],
      }));

      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        errors: details,
        timestamp: new Date().toISOString(),
        path: request.url,
      });

      /*
        ログイン失敗例外
      */
    } else if (exception instanceof LoginFailedException) {
      this.logger.warn(`${exception.message} - Path: ${request.url}`);

      return response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        message: 'Login Failed.', // フィールド情報は漏らさない
        timestamp: new Date().toISOString(),
        path: request.url,
      });

      /*
        Http系の汎用例外（DomainExも含む）
      */
    } else if (exception instanceof HttpException) {
      this.logger.warn(`${exception.message} - Path: ${request.url}`);

      return response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
