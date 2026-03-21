import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { customValidationPipe } from './common/pipes/validation.pipe';
import { GlobalExceptionFilter } from './common/filters/global.exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // バリデーション
  app.useGlobalPipes(customValidationPipe);

  //filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // APIのプレフィックス
  app.setGlobalPrefix('api');

  await app.listen(3001);
}
void bootstrap();
