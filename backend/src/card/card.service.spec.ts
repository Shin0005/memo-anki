/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CardService,
  CardType,
  CreateCardDto,
  UpdateCardDto,
} from './card.service';
import { ICardRepository } from './card.repository.interface';
import { DeckService } from '../deck/deck.service';
import { Card } from '@prisma/client';
import {
  CardnameAlreadyExistException,
  CardNotFoundException,
  DeckNotFoundException,
} from '../common/exceptions/domain.exceptions';

describe('CardService', () => {
  let service: CardService;
  let cardRepoMock: DeepMockProxy<ICardRepository>;
  let deckServiceMock: DeepMockProxy<DeckService>;

  const userId = 'user-123';
  const mockCard: Card = {
    id: 1n,
    deckId: 10n,
    name: 'Test Card',
    type: CardType.NOTE,
    content: 'note content',
    question: null,
    answer: null,
    queue: 0, // 既定値: 0
    repetition: 0, // 既定値: 0
    interval: 1, // 既定値: 1
    easeFactor: 2.5, // 既定値: 2.5
    nextReviewAt: new Date(), // 既定値: now
    version: 0, // 既定値: 0
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    cardRepoMock = mockDeep<ICardRepository>();
    deckServiceMock = mockDeep<DeckService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: 'ICardRepository', // SymbolトークンでのDI
          useValue: cardRepoMock,
        },
        {
          provide: DeckService,
          useValue: deckServiceMock,
        },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
    vi.clearAllMocks();
  });

  describe('createCard', () => {
    const createDto: CreateCardDto = {
      deckId: 10n,
      userId,
      name: 'New Card',
      type: CardType.NOTE,
      content: 'content',
      question: 'q',
      answer: 'a',
    };

    it('正常系: NOTE作成時に question/answer が null として渡されること', async () => {
      // [試験項目: NOTE作成]
      // デッキチェックをパスさせる
      deckServiceMock.getDeckById.mockResolvedValue({ id: 10n } as any);
      cardRepoMock.findByCardname.mockResolvedValue(null);

      await service.createCard(createDto);

      expect(cardRepoMock.createCard).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          content: 'content',
          question: null,
          answer: null,
        }),
      );
    });

    it('正常系: QUIZ作成時に content が null として渡されること', async () => {
      // [試験項目: QUIZ作成]
      const quizDto: CreateCardDto = {
        ...createDto,
        type: CardType.QUIZ,
        question: 'q',
        answer: 'a',
      };
      // デッキチェックをパスさせる
      deckServiceMock.getDeckById.mockResolvedValue({ id: 10n } as any);
      cardRepoMock.findByCardname.mockResolvedValue(null);

      await service.createCard(quizDto);

      expect(cardRepoMock.createCard).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          content: null,
          question: 'q',
          answer: 'a',
        }),
      );
    });

    it('異常系: 名前が重複している場合に例外が飛ぶこと', async () => {
      // [試験項目: 名前重複]
      // まずデッキチェックをパスさせる
      deckServiceMock.getDeckById.mockResolvedValue({ id: 10n } as any);
      cardRepoMock.findByCardname.mockResolvedValue(mockCard);

      await expect(service.createCard(createDto)).rejects.toThrow(
        CardnameAlreadyExistException,
      );
    });

    it('異常系: デッキが存在しない場合に例外が飛ぶこと', async () => {
      // [試験項目: デッキ不在]
      cardRepoMock.findByCardname.mockResolvedValue(null);
      deckServiceMock.getDeckById.mockResolvedValue(null);

      await expect(service.createCard(createDto)).rejects.toThrow(
        DeckNotFoundException,
      );
    });
  });

  describe('getCards', () => {
    it('正常系: 指定したユーザーIDでリポジトリが呼ばれること', async () => {
      // [試験項目: 一覧取得]
      cardRepoMock.findCards.mockResolvedValue([mockCard]);
      await service.getCards(userId);
      expect(cardRepoMock.findCards).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateCard', () => {
    const updateDto: UpdateCardDto = {
      cardId: 1n,
      userId,
      name: 'Updated Name',
      content: 'new content',
      question: 'new q',
      answer: 'new a',
    };

    it('ロジック: 名前が未変更の場合、重複チェックがスキップされること', async () => {
      // [試験項目: 名前変更なし]
      cardRepoMock.findByCardId.mockResolvedValue(mockCard); // 既存名: 'Test Card'
      cardRepoMock.updateCard.mockResolvedValue(mockCard);

      await service.updateCard({ ...updateDto, name: 'Test Card' });

      expect(cardRepoMock.findByCardname).not.toHaveBeenCalled();
    });

    it('正常系: 更新時に現在のType(NOTE)に合わせてフィールドが清算されること', async () => {
      // [試験項目: Type維持更新]
      cardRepoMock.findByCardId.mockResolvedValue({
        ...mockCard,
        type: CardType.NOTE,
      });
      cardRepoMock.updateCard.mockResolvedValue(mockCard);

      await service.updateCard(updateDto);

      expect(cardRepoMock.updateCard).toHaveBeenCalledWith(
        userId,
        1n,
        expect.objectContaining({
          content: 'new content',
          question: null,
          answer: null,
        }),
      );
    });

    it('異常系: カードが存在しない場合に例外が飛ぶこと', async () => {
      // [試験項目: カード不在]
      cardRepoMock.findByCardId.mockResolvedValue(null);
      await expect(service.updateCard(updateDto)).rejects.toThrow(
        CardNotFoundException,
      );
    });

    it('異常系: 変更後の名前が他人のカードと重複する場合に例外が飛ぶこと', async () => {
      // [試験項目: 名前重複]
      cardRepoMock.findByCardId.mockResolvedValue(mockCard);
      cardRepoMock.findByCardname.mockResolvedValue({ id: 2n } as any); // 自分以外のカードがヒット

      await expect(service.updateCard(updateDto)).rejects.toThrow(
        CardnameAlreadyExistException,
      );
    });
  });

  describe('deleteCard', () => {
    it('正常系: 削除が成功すること', async () => {
      // [試験項目: 削除成功]
      cardRepoMock.findByCardId.mockResolvedValue(mockCard);
      await service.deleteCard(userId, 1n);
      expect(cardRepoMock.deleteCard).toHaveBeenCalledWith(userId, 1n);
    });

    it('異常系: 存在しないIDの場合に例外が飛ぶこと', async () => {
      // [試験項目: 存在しないID]
      cardRepoMock.findByCardId.mockResolvedValue(null);
      await expect(service.deleteCard(userId, 1n)).rejects.toThrow(
        CardNotFoundException,
      );
    });
  });
});
