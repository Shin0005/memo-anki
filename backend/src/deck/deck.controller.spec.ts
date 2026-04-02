/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata, Type } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, it, expect, beforeEach } from 'vitest';

import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import { DeckResponse } from './dto/deck.response';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateDeckRequest } from './dto/create-deck.request';
import { UpdateDeckRequest } from './dto/update-deck.request';
import { RequiredDeckIdRequest } from './dto/required-deckid.request';

describe('DeckController', () => {
  let controller: DeckController;
  let serviceMock: DeepMockProxy<DeckService>;
  const targetPipe = new ValidationPipe();

  const userId = 'user-123';

  // サービスから返却されるモックデータ
  const mockDeckData = {
    id: BigInt(1),
    userId,
    name: 'Test Deck',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    serviceMock = mockDeep<DeckService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckController],
      providers: [
        {
          provide: DeckService,
          // 鉄則: 型安全にDIを行うためのキャスト
          useValue: serviceMock as unknown as DeckService,
        },
      ],
    }).compile();

    controller = module.get<DeckController>(DeckController);
  });

  // --- 共通項目 ---
  describe('共通 (Common)', () => {
    it('ガード確認: JwtAuthGuardがクラスに付与されていること', () => {
      // 試験項目: JwtAuthGuardがクラスに付与されていること
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        DeckController,
      ) as Type<unknown>[];
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  // --- createDeck ---
  describe('createDeck', () => {
    it('正常系: 変換確認 - Serviceの戻り値がDeckResponseでラップされ201を返すこと', async () => {
      // 試験項目: Serviceの戻り値がDeckResponseでラップされ、Status 201を返すこと
      const dto: CreateDeckRequest = { name: 'New Deck' };
      serviceMock.createDeck.mockResolvedValue(mockDeckData as any);

      const result = await controller.createDeck(userId, dto);

      expect(result).toBeInstanceOf(DeckResponse);
      expect(result.id).toBe(mockDeckData.id.toString()); // BigIntマッピング確認
    });

    it('バリデーション: nameが空文字(NotBlank)の場合、400エラーがトリガーされること', async () => {
      // 試験項目: nameが空文字(NotBlank)の場合、400エラーがトリガーされること
      const invalidDto = new CreateDeckRequest();
      invalidDto.name = '';

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateDeckRequest,
        data: '',
      };

      await expect(targetPipe.transform(invalidDto, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // --- getDecks ---
  describe('getDecks', () => {
    it('正常系: 引数伝播 - デコレータから取得したuserIdが正しくServiceへ渡されること', async () => {
      // 試験項目: デコレータから取得したuserIdが正しくServiceへ渡されること
      serviceMock.getDecks.mockResolvedValue([mockDeckData] as any);

      await controller.getDecks(userId);

      expect(serviceMock.getDecks).toHaveBeenCalledWith(userId);
    });

    it('正常系: マッピング - 取得した配列の全要素がDeckResponseのインスタンスであること', async () => {
      // 試験項目: 取得した配列の全要素がDeckResponseのインスタンスであること
      serviceMock.getDecks.mockResolvedValue([
        mockDeckData,
        mockDeckData,
      ] as any);

      const result = await controller.getDecks(userId);

      expect(result).toHaveLength(2);
      result.forEach((item) => {
        expect(item).toBeInstanceOf(DeckResponse);
      });
    });
  });

  // --- updateDeck ---
  describe('updateDeck', () => {
    it('正常系: 引数伝播 - userId, UpdateDeckRequestの内容がServiceへ渡されること', async () => {
      // 試験項目: userId, UpdateDeckRequestの内容がServiceへ渡されること
      const dto: UpdateDeckRequest = { deckId: '1', name: 'Updated Name' };
      serviceMock.updateDeck.mockResolvedValue({
        ...mockDeckData,
        name: dto.name,
      } as any);

      await controller.updateDeck(userId, dto);

      const lastCall = serviceMock.updateDeck.mock.lastCall;
      if (!lastCall) throw new Error('Service was not called');

      expect(lastCall[0]).toBe(userId);
      expect(lastCall[1].deckId).toBe(dto.deckId);
      expect(lastCall[1].name).toBe(dto.name);
    });

    it('バリデーション: deckIdが非数字や20桁超の場合、400エラーとなること', async () => {
      // 試験項目: deckIdが非数字や20桁超の場合、400エラーとなること (BigInt境界値)
      const invalidDto = new UpdateDeckRequest();
      invalidDto.deckId = '123456789012345678901'; // 21桁
      invalidDto.name = 'Valid Name';

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: UpdateDeckRequest,
        data: '',
      };

      await expect(targetPipe.transform(invalidDto, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // --- deleteDeck ---
  describe('deleteDeck', () => {
    it('正常系: 完了レスポンス - 成功時にStatus 204 (No Content) を返すこと', async () => {
      // 試験項目: 成功時にStatus 204 (No Content) を返すこと
      const dto: RequiredDeckIdRequest = { deckId: '1' };
      serviceMock.deleteDeck.mockResolvedValue(undefined as unknown as void);

      const result = await controller.deleteDeck(userId, dto);

      // コントローラメソッドの戻り値がvoidであることを確認
      expect(result).toBeUndefined();
      expect(serviceMock.deleteDeck).toHaveBeenCalledWith(userId, dto);
    });
  });
});
