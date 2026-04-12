import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { customValidationPipe } from './common/pipes/validation.pipe';
import { GlobalExceptionFilter } from './common/filters/global.exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // バリデーション
  app.useGlobalPipes(customValidationPipe);

  //filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Cookieの送受信を許可するために必須、samesite:laxでCSRF対策
  });

  // APIのプレフィックス
  app.setGlobalPrefix('api');

  // cookie
  app.use(cookieParser());

  await app.listen(3001);
}
void bootstrap();
