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
    userId: string,
    data: Prisma.CardUncheckedCreateInput,
  ): Promise<Card> {
    return this.prismaService.card.create({
      data: {
        name: data.name,
        type: data.type,
        content: data.content,
        question: data.question,
        answer: data.answer,
        deck: {
          connect: {
            id: data.deckId,
            userId: userId, // 実質的なwhere句
          },
        },
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

  async deleteCard(userId: string, cardId: bigint): Promise<void> {
    await this.prismaService.card.deleteMany({
      where: { deck: { userId }, id: cardId },
    });
  }

  /**
   * 復習対象のカードを取得する
   *
   * デフォルトの取得数は10件
   * @returns nextReviewAtで昇順ソートされたCard10件
   */
  async findReviewCards(userId: string, deckId: bigint): Promise<Card[]> {
    const currentDate = new Date(); // 現在時刻
    return await this.prismaService.card.findMany({
      where: {
        deck: { userId },
        deckId: deckId,
        nextReviewAt: {
          lte: currentDate, // nextReviewAt <= currentDate
        },
      },
      take: 10, // 別serviceから呼ばれるなら変数化も視野に。
      orderBy: {
        nextReviewAt: 'asc',
      },
    });
  }

  /**
   * カードの状態更新
   *
   * versionによる複数ワーカー対策を行っている。
   * 衝突した場合はserviceで例外を投げる仕様。
   * @returns Card or null
   */
  async updateReviewWithVersion(
    userId: string,
    cardId: bigint,
    version: number,
    data: Prisma.CardUncheckedUpdateInput,
  ): Promise<Card | null> {
    const result = await this.prismaService.card.updateMany({
      where: {
        deck: { userId },
        id: cardId,
        version: version, // 楽観ロック
      },
      data: {
        ...data,
        version: { increment: 1 }, // 競合検知のため+1して登録
      },
    });

    // update失敗時（競合時も含まれる）
    if (result.count === 0) {
      return null;
    }
    // 更新後のカードを再取得して返却
    return await this.findByCardId(userId, cardId);
  }
}
