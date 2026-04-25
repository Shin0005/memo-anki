import { Injectable } from '@nestjs/common';
import { PrismaService } from '.././prisma/prisma.service';
import { CreateDeckRequest } from './dto/create-deck.request';
import { Deck, Prisma } from '@prisma/client';
import { UpdateDeckRequest } from './dto/update-deck.request';
import {
  DecknameAlreadyExistException,
  DeckNotFoundException,
} from '../common/exceptions/domain.exceptions';

// 将来的にserviceの引数をtype or interfaceに変更する可能性がある
// このmodule以外、特にnotion連携機能で使う可能性がある。
@Injectable()
export class DeckService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 現在のユーザで既存のdeckのnameがないか検索する
   * 該当するnameがある場合にDeckを返す
   * @param name
   * @returns Deck
   */
  private async findByDeckName(
    userId: string,
    deckName: string,
  ): Promise<Deck | null> {
    return await this.prismaService.deck.findFirst({
      where: {
        userId: userId,
        name: deckName,
      },
    });
  }

  /**
   * 既存のdeckのidがないか検索する
   * 該当するidがある場合にDeckを返す
   * @param deckId
   * @returns Deck
   */
  private async findByDeckId(
    userId: string,
    deckId: string,
  ): Promise<Deck | null> {
    return await this.prismaService.deck.findFirst({
      where: { userId, id: BigInt(deckId) },
    });
  }

  async createDeck(userId: string, request: CreateDeckRequest) {
    // useridが同じかつdeckの名前がすでにあるなら例外スロー
    if (await this.findByDeckName(userId, request.name))
      throw new DecknameAlreadyExistException(request.name);

    const deckInput: Prisma.DeckUncheckedCreateInput = {
      userId: userId,
      name: request.name,
      description: request.description, // undefinedのままでも渡す
    };

    return await this.prismaService.deck.create({
      data: deckInput,
    });
  }

  async getDecks(userId: string) {
    return await this.prismaService.deck.findMany({
      where: { userId: userId },
    });
  }

  // deckcontrollerで呼び出す設計にしていない
  /**
   * deckIdでDeckを検索する。deckIdはバリデーションされている前提
   */
  async getDeckById(userId: string, deckId: string) {
    return await this.prismaService.deck.findFirst({
      where: { userId: userId, id: BigInt(deckId) },
    });
  }

  async updateDeck(userId: string, deckId: string, request: UpdateDeckRequest) {
    const deck = await this.findByDeckId(userId, deckId);
    // idが存在しないとき
    if (!deck) {
      throw new DeckNotFoundException(deckId);
      // nameが編集されていないなら通す。違う名前なら検索する
    } else if (deck.name !== request.name) {
      if (await this.findByDeckName(userId, request.name))
        throw new DecknameAlreadyExistException(request.name);
    }

    const deckInput: Prisma.DeckUncheckedUpdateInput = {
      name: request.name,
      description: request.description, // undefinedのままでも渡す
    };

    const result = await this.prismaService.deck.updateMany({
      where: { userId: deck.userId, id: BigInt(deckId) },
      data: deckInput,
    });

    if (result.count === 0) {
      throw new DeckNotFoundException(String(deck.id));
    }
    // 更新後のデータを取得して返す（count=0でnullになることはない）
    const updatedDeck = await this.findByDeckId(userId, String(deck.id));
    return updatedDeck!;
  }
  async deleteDeck(userId: string, deckId: string) {
    if (!(await this.findByDeckId(userId, deckId)))
      throw new DeckNotFoundException(deckId);

    await this.prismaService.deck.deleteMany({
      where: { userId: userId, id: BigInt(deckId) },
    });
  }
}
