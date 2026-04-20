import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ZodError } from 'zod';

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

/**
 * Validation系 (Zod用)
 */
export class ZodValidationException extends ApplicationException {
  constructor(public readonly zodError: ZodError) {
    super('Validation Failed.', HttpStatus.BAD_REQUEST);
  }
}

export class IsNotNumberException extends ApplicationException {
  constructor(deckId: string) {
    super(` DeckId: ${deckId} is not a Number.`, HttpStatus.BAD_REQUEST);
  }
}
