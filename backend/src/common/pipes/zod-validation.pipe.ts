import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { ZodValidationException } from '../exceptions/application.exceptions';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ZodValidationException(error);
      }
      throw error;
    }
  }
}
