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
import { ParseBigIntIdPipe } from '../common/pipes/parse-bigint-id.pipe';
import { InvalidIdFormatException } from '../common/exceptions/application.exceptions';
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

  // --- ParseBigIntIdPipe ---
  describe('ParseBigIntIdPipe', () => {
    const pipe = new ParseBigIntIdPipe();

    it('正常系: 1〜19桁の数字文字列はそのまま通過すること', () => {
      // [試験項目: 正常値通過]
      expect(pipe.transform('1')).toBe('1');
      expect(pipe.transform('9999999999999999999')).toBe('9999999999999999999'); // 19桁
    });

    it('バリデーション: 非数字文字列の場合、InvalidIdFormatException が飛ぶこと', () => {
      // [試験項目: 非数字]
      expect(() => pipe.transform('abc')).toThrow(InvalidIdFormatException);
      expect(() => pipe.transform('1a2')).toThrow(InvalidIdFormatException);
    });

    it('バリデーション: 20桁以上の場合、InvalidIdFormatException が飛ぶこと', () => {
      // [試験項目: BigInt境界値]
      expect(() => pipe.transform('12345678901234567890')).toThrow(
        InvalidIdFormatException,
      ); // 20桁
    });

    it('バリデーション: 空文字の場合、InvalidIdFormatException が飛ぶこと', () => {
      // [試験項目: 空文字]
      expect(() => pipe.transform('')).toThrow(InvalidIdFormatException);
    });
  });

  // --- updateCard ---
  describe('updateCard', () => {
    it('正常系: 変換確認 - パスパラメータの cardId が Service へ渡されること', async () => {
      // [試験項目: 変換確認]
      const request: UpdateCardRequest = {
        name: 'Updated Name',
        content: 'new content',
        question: undefined,
        answer: undefined,
      };
      serviceMock.updateCard.mockResolvedValue(mockCardData);

      await controller.updateCard(userId, '1', request);

      expect(serviceMock.updateCard).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Updated Name',
        }),
      );
    });
  });

  // --- deleteCard ---
  describe('deleteCard', () => {
    it('正常系: 完了レスポンス - 成功時に Status 204 (No Content) を返すこと', async () => {
      // [試験項目: 完了レスポンス]
      // NestJSの@HttpCode(204)はメタデータとして付与されるため、
      // 実際のエンドポイント呼び出し（E2E）で検証するのが一般的ですが、
      // ここではメソッドが正常に完了することを確認します。
      serviceMock.deleteCard.mockResolvedValue(undefined);

      await expect(controller.deleteCard(userId, '1')).resolves.not.toThrow();
      expect(serviceMock.deleteCard).toHaveBeenCalledWith(userId, '1');
    });
  });
});
