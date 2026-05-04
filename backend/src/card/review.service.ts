import { Card } from '@prisma/client';
import { ICardRepository } from './card.repository.interface';

import { Inject, Injectable } from '@nestjs/common';
import { DeckService } from '../deck/deck.service';
import { sortReviewQueue } from './sort-review-queue';
import { DeckNotFoundException } from '../common/exceptions/domain.exceptions';

export type GetReviewCardDto = {
  deckId: string;
  userId: string;
};

@Injectable()
export class ReviewService {
  constructor(
    @Inject('ICardRepository') // DI用のtoken
    private readonly iCardRepository: ICardRepository,
    private readonly deckService: DeckService,
  ) {}
  /**
   * 復習キューを取得する
   * @param dto
   */
  async findReviewCards(dto: GetReviewCardDto) {
    // PrismaのInput型がないのでdtoのままRepositoryへ渡す。
    const { deckId, userId } = dto;

    // 与えられたdeckidが存在するかまたはユーザのものかを検証
    const deck = await this.deckService.getDeckById(userId, deckId);
    if (!deck) throw new DeckNotFoundException(deckId);

    const reviewCards = await this.iCardRepository.findReviewCards(
      userId,
      BigInt(deckId), // pipesでbigint保証済
    );
    // カードを並び替え
    const sortedQueue: Card[] = sortReviewQueue(reviewCards);
    return sortedQueue;
  }
}
