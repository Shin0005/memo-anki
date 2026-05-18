import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { customValidationPipe } from './common/pipes/validation.pipe';
import { GlobalExceptionFilter } from './common/filters/global.exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Railway のロードバランサ越しでも X-Forwarded-For から実クライアント IP を取得できるようにする(Throttler 用)
  app.set('trust proxy', 1);

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

  const config = new DocumentBuilder()
    .setTitle('memo-anki API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3001);
}
void bootstrap();
