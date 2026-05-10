/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Card } from '@prisma/client';
import { CardQueue, CardType, ReviewRating } from '@memo-anki/shared';

import { ReviewService } from './review.service';
import { ICardRepository } from './card.repository.interface';
import { DeckService } from '../deck/deck.service';
import {
  CardNotFoundException,
  CardVersionConflictException,
} from '../common/exceptions/domain.exceptions';

/**
 * ReviewService.reviewCard の振る舞いに焦点。
 * applyRating 自体のロジックは apply-rating.spec.ts でカバーするので、ここでは
 *   - 認可チェックが先に走るか
 *   - 楽観ロックの結果がそのまま例外に反映されるか
 * を検証する。
 */
describe('ReviewService.reviewCard', () => {
  let service: ReviewService;
  let cardRepoMock: DeepMockProxy<ICardRepository>;
  let deckServiceMock: DeepMockProxy<DeckService>;

  const userId = 'user-123';
  const cardId = '1';

  // applyRating が触らないカラムも含めたフルカラムのモック
  const baseCard: Card = {
    id: 1n,
    deckId: 10n,
    name: 'card',
    type: CardType.NOTE,
    content: 'c',
    question: null,
    answer: null,
    queue: CardQueue.SHORT, // SHORT×GOODで検証する
    repetition: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewAt: new Date(),
    version: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    cardRepoMock = mockDeep<ICardRepository>();
    deckServiceMock = mockDeep<DeckService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: 'ICardRepository', useValue: cardRepoMock },
        { provide: DeckService, useValue: deckServiceMock },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    vi.clearAllMocks();
  });

  it('正常系: 認可付きでカードを取得し、楽観ロック更新が呼ばれること', async () => {
    // [試験項目: 採点正常フロー]
    cardRepoMock.findByCardId.mockResolvedValue(baseCard);
    cardRepoMock.updateReviewWithVersion.mockResolvedValue({
      ...baseCard,
      version: 4,
    });

    const result = await service.reviewCard({
      userId,
      cardId,
      rating: ReviewRating.GOOD,
      version: 3,
    });

    // findByCardIdは userId スコープで呼ばれる（他人のカードは取得不可）
    expect(cardRepoMock.findByCardId).toHaveBeenCalledWith(userId, 1n);
    // updateReviewWithVersion は userId / cardId / version / 次状態 を渡す
    // 次状態の詳細は applyRating 側でテスト済み。ここでは SHORT×GOOD 1回目の
    // 確定値(queue=SHORT, repetition=1)だけを契約として確認。
    expect(cardRepoMock.updateReviewWithVersion).toHaveBeenCalledWith(
      userId,
      1n,
      3,
      expect.objectContaining({
        queue: CardQueue.SHORT,
        repetition: 1,
      }),
    );
    expect(result.version).toBe(4);
  });

  it('異常系: カードが存在しない場合、CardNotFoundException', async () => {
    // [試験項目: 不在カード]
    cardRepoMock.findByCardId.mockResolvedValue(null);
    await expect(
      service.reviewCard({
        userId,
        cardId,
        rating: ReviewRating.GOOD,
        version: 3,
      }),
    ).rejects.toThrow(CardNotFoundException);
    // 不在ならupdateも呼ばれない
    expect(cardRepoMock.updateReviewWithVersion).not.toHaveBeenCalled();
  });

  it('異常系: 楽観ロック競合(更新0件)で CardVersionConflictException', async () => {
    // [試験項目: バージョン競合]
    cardRepoMock.findByCardId.mockResolvedValue(baseCard);
    // version不一致でnullが返る想定
    cardRepoMock.updateReviewWithVersion.mockResolvedValue(null);

    await expect(
      service.reviewCard({
        userId,
        cardId,
        rating: ReviewRating.GOOD,
        version: 99,
      }),
    ).rejects.toThrow(CardVersionConflictException);
  });
});
