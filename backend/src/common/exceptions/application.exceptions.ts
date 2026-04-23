import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * 抽象アプリケーション例外 継承させて使用する
 */
export abstract class ApplicationException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }
}

/**
 *  Validation系
 *  (anyを使わざるを得ないBadRequestを使わずに独自例外を作成し方安全を保障)
 */
export class ValidationFailedException extends ApplicationException {
  constructor(public readonly validationErrors: ValidationError[]) {
    super('Validation Failed.', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidIdFormatException extends ApplicationException {
  constructor(id: string) {
    super(
      `Id: ${id} is not a valid format (must be 1-19 digit numeric string).`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
