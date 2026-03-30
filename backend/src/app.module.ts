import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DeckModule } from './deck/deck.module';
import { CardModule } from './card/card.module';

@Module({
  imports: [PrismaModule, UserModule, AuthModule, DeckModule, CardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
