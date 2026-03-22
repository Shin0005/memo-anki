import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ValidationFailedException } from '../exceptions/application.exceptions';

export const customValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  stopAtFirstError: true,
  // BadRequestを投げずに独自例外を投げる
  exceptionFactory: (errors: ValidationError[]) => {
    return new ValidationFailedException(errors);
  },
});
