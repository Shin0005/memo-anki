/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { describe, it, expect, beforeEach } from 'vitest';

import { DeckService } from './deck.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DecknameAlreadyExistException,
  DeckNotFoundException,
} from '../common/exceptions/domain.exceptions'; // プロジェクトの例外クラスを想定
import { CreateDeckRequest } from './dto/create-deck.request';
import { UpdateDeckRequest } from './dto/update-deck.request';

describe('DeckService', () => {
  let service: DeckService;
  let prismaMock: DeepMockProxy<PrismaService>;

  const userId = 'user-123';
  const mockDeck = {
    id: BigInt(1),
    userId,
    name: 'Existing Deck',
    description: 'description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Prismaの型が複雑すぎて解析不能になるための回避策

    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckService,
        {
          provide: PrismaService,

          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DeckService>(DeckService);
  });

  // --- 1. createDeck ---
  describe('createDeck', () => {
    const createDto: CreateDeckRequest = { name: 'New Deck' };

    it('正常系: Prismaのcreateが正しい引数で呼ばれること', async () => {
      // 試験項目: PrismaのcreateがDeckUncheckedCreateInput形式の正しい引数で呼ばれること
      prismaMock.deck.findFirst.mockResolvedValue(null);
      prismaMock.deck.create.mockResolvedValue(mockDeck);

      await service.createDeck(userId, createDto);

      expect(prismaMock.deck.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: createDto.name,
        },
      });
    });

    it('異常系: 名前重複時にDecknameAlreadyExistExceptionが飛ぶこと', async () => {
      // 試験項目: 同一ユーザー内で既存のnameを指定した場合、Exceptionが飛ぶこと
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

      await expect(service.createDeck(userId, createDto)).rejects.toThrow(
        DecknameAlreadyExistException,
      );
    });
  });

  // --- 2. getDecks ---
  describe('getDecks', () => {
    it('正常系: findManyが実行され、userIdによるフィルタリングが行われること', async () => {
      // 試験項目: findManyが実行され、userIdによるフィルタリングが正しく行われること
      prismaMock.deck.findMany.mockResolvedValue([mockDeck]);

      await service.getDecks(userId);

      expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });
  // --- 2.5 getDeckById ---
  describe('getDeckById', () => {
    const deckId = '1';

    it('正常系: 指定したdeckIdとuserIdでfindFirstが呼ばれ、データが返ること', async () => {
      // 試験項目: 指定したdeckIdでfindFirst（findFirst）が呼ばれ、データが返ること
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

      const result = await service.getDeckById(userId, BigInt(deckId));

      expect(prismaMock.deck.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(deckId), userId },
      });
      expect(result).toEqual(mockDeck);
    });

    it('正常系/異常系境界: データが存在しない場合に null を返すこと', async () => {
      // 試験項目: 安全性の確認（例外を投げず、呼び出し元に判断を委ねる設計）
      prismaMock.deck.findFirst.mockResolvedValue(null);

      const result = await service.getDeckById(userId, BigInt(deckId));

      expect(result).toBeNull();
    });
  });

  // --- 3. updateDeck ---
  describe('updateDeck', () => {
    const deckId = '1';
    const updateDto: UpdateDeckRequest = { name: 'Updated Name' };

    it('正常系: nameが未変更の場合、重複チェック(findByDeckName)が呼ばれないこと', async () => {
      const sameNameDto = { ...updateDto, name: mockDeck.name };

      // 1回目(存在確認)と2回目(更新後取得)の両方でmockDeckを返す
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
      prismaMock.deck.updateMany.mockResolvedValue({ count: 1 });

      await service.updateDeck(userId, deckId, sameNameDto);

      // findFirst自体はID検索で呼ばれるため、
      // 「name（重複チェック）を条件に含むfindFirst」が呼ばれていないことを検証する
      expect(prismaMock.deck.findFirst).not.toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ name: sameNameDto.name }),
        }),
      );
    });

    it('正常系: name変更時、重複チェックが走り、updateManyが呼ばれること', async () => {
      // 試験項目: name変更時、重複チェックが走り、問題なければupdateManyが呼ばれること
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
      prismaMock.deck.findFirst.mockResolvedValue(null); // 重複なし
      prismaMock.deck.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.deck.findFirst.mockResolvedValue({
        ...mockDeck,
        name: updateDto.name,
      });

      await service.updateDeck(userId, deckId, updateDto);

      expect(prismaMock.deck.findFirst).toHaveBeenCalled();
      expect(prismaMock.deck.updateMany).toHaveBeenCalled();
    });

    it('異常系: 存在しないIDに対し、DeckNotFoundExceptionが飛ぶこと', async () => {
      // 試験項目: 最初の存在確認で不正なdeckIdに対し、DeckNotFoundExceptionが飛ぶこと
      prismaMock.deck.findFirst.mockRejectedValue(
        new DeckNotFoundException('Not Found'),
      );

      await expect(
        service.updateDeck(userId, deckId, updateDto),
      ).rejects.toThrow(DeckNotFoundException);
    });

    it('異常系: 名前重複時にAlreadyExistExが飛ぶこと', async () => {
      // 試験項目: 変更後のnameが既に他で使用されている場合、AlreadyExistExが飛ぶこと
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
      prismaMock.deck.findFirst.mockResolvedValue({
        ...mockDeck,
        id: BigInt(2),
      }); // 他のDeckがその名を使用中

      await expect(
        service.updateDeck(userId, deckId, updateDto),
      ).rejects.toThrow(DecknameAlreadyExistException);
    });

    it('異常系: updateManyの戻り値countが0の場合、DeckNotFoundExceptionが飛ぶこと', async () => {
      // 試験項目: updateManyの戻り値countが0の場合、DeckNotFoundExceptionが飛ぶこと
      const updateDto: UpdateDeckRequest = { name: 'New Name' };

      // 存在確認はパスするが、更新実行時に何らかの理由（他者による削除等）で対象がなくなるケース
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
      prismaMock.deck.findFirst.mockResolvedValue(null);
      prismaMock.deck.updateMany.mockResolvedValue({ count: 0 }); // 更新失敗

      await expect(
        service.updateDeck(userId, deckId, updateDto),
      ).rejects.toThrow(DeckNotFoundException);
    });
  });

  // --- 4. deleteDeck ---
  describe('deleteDeck', () => {
    const deckId = '1';

    it('正常系: 正しいdeckIdでdeleteManyが呼ばれること', async () => {
      // 試験項目: 正しいdeckIdでdeleteManyが呼ばれること
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
      prismaMock.deck.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteDeck(userId, deckId);

      expect(prismaMock.deck.deleteMany).toHaveBeenCalledWith({
        where: {
          id: BigInt(deckId),
          userId,
        },
      });
    });

    it('異常系: findByDeckIdによる事前チェックで対象がない場合、NotFoundExceptionが飛ぶこと', async () => {
      // Prismaがエラーを投げるのではなく、null（見つからない）を返すようにする
      prismaMock.deck.findFirst.mockResolvedValue(null);

      await expect(service.deleteDeck(userId, deckId)).rejects.toThrow(
        DeckNotFoundException,
      );
    });
  });
});
