/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { describe, it, expect, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { CardRepository } from './card.repository';
import { PrismaService } from '../prisma/prisma.service';
import { DeckNotFoundException } from '../common/exceptions/domain.exceptions';
import { CardType } from '@memo-anki/shared';

/**
 * CardRepository.createManyNote() の単体試験
 *
 * 単体で 3 観点（認可OK / データ整形 / 認可NG）を検証する。
 */
describe('CardRepository', () => {
  let repo: CardRepository;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repo = module.get<CardRepository>(CardRepository);

    // $transaction(callback) を「コールバックを即時実行する」形にスタブ。
    // tx として prismaMock 自身を渡し、内部の tx.deck.* / tx.card.* を mock で観測する。
    prismaMock.$transaction.mockImplementation(
      (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        cb(prismaMock),
    );
  });

  describe('createManyNote', () => {
    const userId = 'user-1';
    const deckId = 10n;
    // findFirst の戻りは Deck 型の全プロパティを期待するため、最小限のスタブを用意
    const deckStub = {
      id: deckId,
      userId,
      name: 'my-deck',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('正常系: 認可OK → createMany が呼ばれて作成件数を返す', async () => {
      prismaMock.deck.findFirst.mockResolvedValue(deckStub);
      prismaMock.card.createMany.mockResolvedValue({ count: 2 });

      const result = await repo.createManyNote({
        userId,
        deckId,
        rawNotes: [
          { name: 'note-1', content: 'body-1' },
          { name: 'note-2', content: 'body-2' },
        ],
      });

      expect(result).toBe(2);
      // 認可チェックが userId + deckId で実行されていること
      expect(prismaMock.deck.findFirst).toHaveBeenCalledWith({
        where: { id: deckId, userId },
        select: { id: true },
      });
    });

    it('正常系: rawNotes が deckId/type=NOTE/content を含む形で createMany に渡る', async () => {
      prismaMock.deck.findFirst.mockResolvedValue(deckStub);
      prismaMock.card.createMany.mockResolvedValue({ count: 2 });

      await repo.createManyNote({
        userId,
        deckId,
        rawNotes: [
          { name: 'note-1', content: 'body-1' },
          { name: 'note-2', content: null }, // content が null のケースも素通しされること
        ],
      });

      // type は CardType.NOTE 固定で、deckId / name / content がそのままマップされること
      expect(prismaMock.card.createMany).toHaveBeenCalledWith({
        data: [
          { deckId, name: 'note-1', type: CardType.NOTE, content: 'body-1' },
          { deckId, name: 'note-2', type: CardType.NOTE, content: null },
        ],
      });
    });

    it('異常系: 認可NG（他人 or 不在の deck） → DeckNotFoundException、createMany 呼ばれない', async () => {
      prismaMock.deck.findFirst.mockResolvedValue(null);

      await expect(
        repo.createManyNote({
          userId,
          deckId,
          rawNotes: [{ name: 'note-1', content: 'body-1' }],
        }),
      ).rejects.toBeInstanceOf(DeckNotFoundException);

      // tx.card.createMany が一切呼ばれていない（巻き戻り＝書き込みなしの保証）
      expect(prismaMock.card.createMany).not.toHaveBeenCalled();
    });
  });
});
