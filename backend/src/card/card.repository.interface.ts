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
  findReviewCards(userId: string, deckId: bigint): Promise<Card[]>;
  updateReviewWithVersion(
    userId: string,
    cardId: bigint,
    version: number,
    data: Prisma.CardUncheckedUpdateInput,
  ): Promise<Card | null>;
  createManyNote(input: {
    userId: string;
    deckId: bigint;
    rawNotes: { name: string; content: string | null }[];
  }): Promise<number>;
}

// DI用のトークン
export const ICardRepository = Symbol('ICardRepository');
