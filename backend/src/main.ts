import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { customValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // バリデーション
  app.useGlobalPipes(customValidationPipe);

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
