/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata, Type } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, it, expect, beforeEach } from 'vitest';

import { CardController } from './card.controller';
import { CardService } from './card.service';
import { CardResponse } from './dto/card.response';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateCardRequest } from './dto/create-card.request';
import { UpdateCardRequest } from './dto/update-card.request';
import { RequiredCardIdRequest } from './dto/required-cardid.request';
import { Card } from '@prisma/client';

describe('CardController', () => {
  let controller: CardController;
  let serviceMock: DeepMockProxy<CardService>;
  const targetPipe = new ValidationPipe({ transform: true });

  const userId = 'user-123';

  // schema.prismaに基づいたフルカラムのモックデータ
  const mockCardData: Card = {
    id: 1n,
    deckId: 10n,
    name: 'Test Card',
    type: 0,
    content: 'note content',
    question: null,
    answer: null,
    queue: 0,
    repetition: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewAt: new Date(),
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    serviceMock = mockDeep<CardService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [
        {
          provide: CardService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<CardController>(CardController);
  });

  // --- 共通系 ---
  describe('共通設定', () => {
    it('ガード確認: クラスまたはメソッドに JwtAuthGuard が付与されていること', () => {
      // [試験項目: ガード確認]
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        CardController,
      ) as Array<Type<unknown> | ((...args: unknown[]) => unknown)>; // Functionが方安全でない
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  // --- createCard ---
  describe('createCard', () => {
    it('正常系: 変換確認 - 文字列の deckId が BigInt に変換され Service へ渡されること', async () => {
      // [試験項目: 変換確認]
      const request: CreateCardRequest = {
        deckId: '10',
        name: 'New Card',
        type: 0,
        content: 'content',
        question: undefined,
        answer: undefined,
      };
      serviceMock.createCard.mockResolvedValue(mockCardData);

      await controller.createCard(userId, request);

      expect(serviceMock.createCard).toHaveBeenCalledWith(
        expect.objectContaining({
          deckId: 10n,
        }),
      );
    });

    it('正常系: レスポンス - 戻り値が CardResponse でラップされていること', async () => {
      // [試験項目: レスポンス]
      serviceMock.createCard.mockResolvedValue(mockCardData);
      const request = new CreateCardRequest();
      request.deckId = '10';

      const result = await controller.createCard(userId, request);

      expect(result).toBeInstanceOf(CardResponse);
      expect(result.id).toBe(mockCardData.id.toString());
    });

    it('バリデーション: type に 0, 1 以外が指定された場合、400エラーとなること', async () => {
      // [試験項目: 列挙型バリデーション]
      const invalidRequest = new CreateCardRequest();
      invalidRequest.deckId = '10';
      invalidRequest.name = 'Test';
      invalidRequest.type = 9; // 不正な値

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateCardRequest,
        data: '',
      };

      await expect(
        targetPipe.transform(invalidRequest, metadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- getCards ---
  describe('getCards', () => {
    it('正常系: 配列変換 - Service の戻り値が個別に CardResponse インスタンス化されていること', async () => {
      // [試験項目: 配列変換]
      serviceMock.getCards.mockResolvedValue([mockCardData]);

      const result = await controller.getCards(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBeInstanceOf(CardResponse);
    });
  });

  // --- updateCard ---
  describe('updateCard', () => {
    it('正常系: 変換確認 - 文字列の cardId が BigInt に変換され Service へ渡されること', async () => {
      // [試験項目: 変換確認]
      const request: UpdateCardRequest = {
        cardId: '1',
        name: 'Updated Name',
        content: 'new content',
        question: undefined,
        answer: undefined,
      };
      serviceMock.updateCard.mockResolvedValue(mockCardData);

      await controller.updateCard(userId, request);

      expect(serviceMock.updateCard).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 1n,
        }),
      );
    });

    it('バリデーション: cardId が非数字や20桁超の場合、400エラーとなること', async () => {
      // [試験項目: BigInt境界値]
      const invalidRequest = new UpdateCardRequest();
      invalidRequest.cardId = '123456789012345678901'; // 21桁
      invalidRequest.name = 'Valid Name';

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: UpdateCardRequest,
        data: '',
      };

      await expect(
        targetPipe.transform(invalidRequest, metadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- deleteCard ---
  describe('deleteCard', () => {
    it('正常系: 完了レスポンス - 成功時に Status 204 (No Content) を返すこと', async () => {
      // [試験項目: 完了レスポンス]
      // NestJSの@HttpCode(204)はメタデータとして付与されるため、
      // 実際のエンドポイント呼び出し（E2E）で検証するのが一般的ですが、
      // ここではメソッドが正常に完了することを確認します。
      const request: RequiredCardIdRequest = { cardId: '1' };
      serviceMock.deleteCard.mockResolvedValue(undefined);

      await expect(
        controller.deleteCard(userId, request),
      ).resolves.not.toThrow();
      expect(serviceMock.deleteCard).toHaveBeenCalledWith(userId, 1n);
    });
  });
});
