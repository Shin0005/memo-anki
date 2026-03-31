import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICardRepository } from './card.repository.interface';
import { Card, Prisma } from '@prisma/client';
import { CardNotFoundException } from '../common/exceptions/domain.exceptions';

// userIdをwhereに含めることで一貫してrepositoryでの認可の強化を推進している。
@Injectable()
export class CardRepository implements ICardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByCardId(userId: string, cardId: bigint): Promise<Card | null> {
    return this.prismaService.card.findFirst({
      where: { deck: { userId }, id: cardId },
    });
  }

  async findByCardname(userId: string, cardname: string): Promise<Card | null> {
    return await this.prismaService.card.findFirst({
      where: {
        deck: { userId },
        name: cardname,
      },
    });
  }

  async findCards(userId: string): Promise<Card[]> {
    return await this.prismaService.card.findMany({
      where: { deck: { userId } },
    });
  }

  async createCard(
    deckId: bigint,
    data: Prisma.CardUncheckedCreateInput,
  ): Promise<Card> {
    return this.prismaService.card.create({
      data: {
        deckId,
        name: data.name,
        type: data.type,
        content: data.content,
        question: data.question,
        answer: data.answer,
      },
    });
  }

  // updateinput内のカラムは純粋なstringではないのでwhere条件には使えない
  async updateCard(
    userId: string,
    cardId: bigint,
    data: Prisma.CardUncheckedUpdateInput,
  ): Promise<Card> {
    const result = await this.prismaService.card.updateMany({
      where: { deck: { userId }, id: cardId },
      data: data,
    });

    if (result.count === 0) {
      throw new CardNotFoundException(String(cardId));
    }
    // 更新後のデータを取得して返す（count=0でnullになることはない）
    const updatedCard = await this.findByCardId(userId, cardId);
    return updatedCard!;
  }

  async deleteCard(userId: string, deckId: bigint): Promise<Card> {
    return this.prismaService.card.delete({
      where: { deck: { userId }, id: deckId },
    });
  }
}
