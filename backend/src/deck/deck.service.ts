import { Injectable } from '@nestjs/common';
import { PrismaService } from '.././prisma/prisma.service';
import { CreateDeckRequest } from './dto/create-deck.request';
import { Deck, Prisma } from '@prisma/client';
import { UpdateDeckRequest } from './dto/update-deck.request';
import {
  DecknameAlreadyExistException,
  DeckNotFoundException,
} from '../common/exceptions/domain.exceptions';
import { RequiredDeckIdRequest } from './dto/required-deckid.request';

// 将来的にserviceの引数をtype or interfaceに変更する可能性がある
// このmodule以外、特にnotion連携機能で使う可能性がある。
@Injectable()
export class DeckService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 現在のユーザで既存のdeckのnameがないか検索する
   * 該当するnameがある場合にtrueを返す
   * @param name
   * @returns boolean
   */
  private async validDeckName(
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
   * 該当するidがある場合にfalseを返す
   * @param deckId
   * @returns boolean
   */
  private async validDeckId(deckId: string): Promise<Deck | null> {
    return await this.prismaService.deck.findUnique({
      where: { id: BigInt(deckId) },
    });
  }

  async createDeck(userId: string, request: CreateDeckRequest) {
    // useridが同じかつdeckの名前がすでにあるなら例外スロー
    if (await this.validDeckName(userId, request.name))
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
  async getDeckById(userId: string, deckId: bigint) {
    return await this.prismaService.deck.findUniqueOrThrow({
      where: { userId: userId, id: deckId },
    });
  }

  async updateDeck(userId: string, request: UpdateDeckRequest) {
    if (!(await this.validDeckId(request.deckId)))
      throw new DeckNotFoundException(request.deckId);

    const deckInput: Prisma.DeckUncheckedUpdateInput = {
      name: request.name,
      description: request.description, // undefinedのままでも渡す
    };

    return await this.prismaService.deck.update({
      where: { userId: userId, id: BigInt(request.deckId) },
      data: deckInput,
    });
  }
  async deleteDeck(userId: string, request: RequiredDeckIdRequest) {
    if (!(await this.validDeckId(request.deckId)))
      throw new DeckNotFoundException(request.deckId);

    await this.prismaService.deck.delete({
      where: { userId: userId, id: BigInt(request.deckId) },
    });
  }
}
