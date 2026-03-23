import { Injectable } from '@nestjs/common';
import { PrismaService } from '.././prisma/prisma.service';
import { CreateDeckRequest } from './dto/create-deck.request';
import { Deck, Prisma } from '@prisma/client';
import { UpdateDeckRequest } from './dto/update-deck.request';
import { DeckResponse } from './dto/deck.response';
import { IsNotNumberException } from '../common/exceptions/application.exceptions';
import {
  DecknameAlreadyExistException,
  DeckNotFoundException,
} from '../common/exceptions/domain.exceptions';

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

    const result: Deck = await this.prismaService.deck.create({
      data: deckInput,
    });
    return new DeckResponse(result);
  }

  async getDecks(userId: string) {
    const results = await this.prismaService.deck.findMany({
      where: { userId: userId },
    });
    return results.map((deck) => new DeckResponse(deck));
  }

  async updateDeck(userId: string, request: UpdateDeckRequest) {
    // DeckIdに数字（0-9）が1文字以上並んでいるかチェック
    if (!/^\d+$/.test(request.deckId))
      throw new IsNotNumberException(request.deckId);
    if (!(await this.validDeckId(request.deckId)))
      throw new DeckNotFoundException(request.deckId);

    const deckInput: Prisma.DeckUncheckedUpdateInput = {
      name: request.name,
      description: request.description, // undefinedのままでも渡す
    };

    const result: Deck = await this.prismaService.deck.update({
      where: { userId: userId, id: BigInt(request.deckId) },
      data: deckInput,
    });
    return new DeckResponse(result);
  }

  async deleteDeck(userId: string, deckId: string) {
    // DeckIdに数字（0-9）が1文字以上並んでいるかチェック
    if (!/^\d+$/.test(deckId)) throw new IsNotNumberException(deckId);
    if (!(await this.validDeckId(deckId)))
      throw new DeckNotFoundException(deckId);

    const result: Deck = await this.prismaService.deck.delete({
      where: { userId: userId, id: BigInt(deckId) },
    });
    return new DeckResponse(result);
  }
}
