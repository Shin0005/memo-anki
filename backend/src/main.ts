import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global.exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // グローバルフィルター
  app.useGlobalFilters(new GlobalExceptionFilter());

  // pipesは個別でつける設定に変更

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
