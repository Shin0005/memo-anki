import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DeckModule } from './deck/deck.module';
import { CardModule } from './card/card.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // vercelでは管理画面で設定した値が自動的にprocess.envに読み込まれる
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), // 確実に.envを読み込ませる
    PrismaModule,
    UserModule,
    AuthModule,
    DeckModule,
    CardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
