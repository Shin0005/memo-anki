import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DeckModule } from './deck/deck.module';
import { CardModule } from './card/card.module';
import { NotionModule } from './integrations/notion/notion.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // vercelでは管理画面で設定した値が自動的にprocess.envに読み込まれる
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), // 確実に.envを読み込ませる
    // レート制限。既定で 1IP あたり 60秒で60リクエスト。個別上書きは @Throttle() で行う。
    // テスト中は全スルー。
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    DeckModule,
    CardModule,
    NotionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerGuard を全エンドポイントに適用
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
