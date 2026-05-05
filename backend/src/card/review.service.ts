import { Card, Prisma } from '@prisma/client';
import { ICardRepository } from './card.repository.interface';

import { Inject, Injectable } from '@nestjs/common';
import { DeckService } from '../deck/deck.service';
import { sortReviewQueue } from './sort-review-queue';
import {
  CardNotFoundException,
  CardVersionConflictException,
  DeckNotFoundException,
} from '../common/exceptions/domain.exceptions';
import { ReviewRating } from '@memo-anki/shared';
import { applyRating } from './apply-rating';

export type GetReviewCardDto = {
  deckId: string;
  userId: string;
};

export type ReviewCardDto = {
  userId: string;
  cardId: string;
  rating: ReviewRating;
  version: number;
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
   * @returns ソートされたCard10件
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

  /**
   * 採点を反映してカードを更新する。
   * @returns 更新後のCard
   */
  async reviewCard(dto: ReviewCardDto): Promise<Card> {
    const { userId, cardId, rating, version } = dto;

    // 与えられたCardIdが存在するかまたはユーザのものかを検証
    const card = await this.iCardRepository.findByCardId(
      userId,
      BigInt(cardId), // pipesでbigint保証済
    );
    if (!card) throw new CardNotFoundException(cardId);

    // 次の状態を計算
    const appliedCard = applyRating(card, rating);

    // DBに計算した状態を反映
    const updateInput: Prisma.CardUncheckedUpdateInput = {
      queue: appliedCard.queue,
      repetition: appliedCard.repetition,
      interval: appliedCard.interval,
      easeFactor: appliedCard.easeFactor,
      nextReviewAt: appliedCard.nextReviewAt,
    };
    const updatedCard = await this.iCardRepository.updateReviewWithVersion(
      userId,
      card.id,
      version,
      updateInput,
    );

    // 別ワーカーに先を越されたときnullを返すので例外を投げる
    if (!updatedCard) throw new CardVersionConflictException(cardId);
    return updatedCard;
  }
}
