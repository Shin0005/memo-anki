import { Card, Prisma } from '@prisma/client';

export interface ICardRepository {
  findByCardId(userId: string, cardId: bigint): Promise<Card | null>;
  findByCardname(userId: string, cardname: string): Promise<Card | null>;
  findCards(userId: string): Promise<Card[]>;
  createCard(
    userId: string,
    data: Prisma.CardUncheckedCreateInput,
  ): Promise<Card>;
  deleteCard(userId: string, cardId: bigint): Promise<void>;
  updateCard(
    userId: string,
    cardId: bigint,
    data: Prisma.CardUncheckedUpdateInput,
  ): Promise<Card>;
}

// DI用のトークン
export const ICardRepository = Symbol('ICardRepository');
