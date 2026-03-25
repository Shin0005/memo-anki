import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICardRepository } from './card.repository.interface';
import { Card, Prisma } from '@prisma/client';

@Injectable()
export class CardRepository implements ICardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByCardId(userId: string, id: bigint): Promise<Card | null> {
    return this.prismaService.card.findUnique({ where: { userId, id } });
  }

  async findByCardname(userId: string, cardname: string): Promise<Card | null> {
    return await this.prismaService.card.findFirst({
      where: {
        userId: userId,
        name: cardname,
      },
    });
  }

  async findCards(userId: string): Promise<Card[]> {
    return await this.prismaService.card.findMany({
      where: { userId },
    });
  }

  async createCard(
    userId: string,
    data: Prisma.CardUncheckedCreateInput,
  ): Promise<Card> {
    return this.prismaService.card.create({
      data: {
        ...data,
        userId: userId, // 他人のカードを作らせない
      },
    });
  }

  // updateinput内のカラムは純粋なstringではないのでwhere条件には使えない
  async updateCard(
    userId: string,
    id: bigint,
    data: Prisma.CardUncheckedUpdateInput,
  ): Promise<Card> {
    return this.prismaService.card.update({
      where: { userId, id },
      data: {
        ...data,
        userId: userId, // 他人のカードを上書きさせない
      },
    });
  }
  async deleteCard(userId: string, id: bigint): Promise<Card> {
    return this.prismaService.card.delete({
      where: { userId, id },
    });
  }
}
