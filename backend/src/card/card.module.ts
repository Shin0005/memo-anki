import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CardRepository } from './card.repository';
import { DeckModule } from '../deck/deck.module';
import { ReviewService } from './review.service';

@Module({
  imports: [PrismaModule, DeckModule],
  controllers: [CardController],
  providers: [
    CardService,
    ReviewService,
    {
      provide: 'ICardRepository', // DI用のtoken
      useClass: CardRepository, // 実装
    },
  ],
  exports: [CardService, 'ICardRepository'],
})
export class CardModule {}
