import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

export const customValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  stopAtFirstError: true,
  // validationエラーのレスポンス形式はfilterに委譲する
  exceptionFactory: (errors: ValidationError[]) => {
    return new BadRequestException(errors);
  },
});
