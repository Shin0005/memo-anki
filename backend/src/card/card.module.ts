import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CardRepository } from './card.repository';
import { DeckModule } from '../deck/deck.module';

@Module({
  imports: [PrismaModule, DeckModule],
  controllers: [CardController],
  providers: [
    CardService,
    {
      provide: 'ICardRepository', // DI用のtoken
      useClass: CardRepository, // 実装
    },
  ],
  exports: [CardService],
})
export class CardModule {}
