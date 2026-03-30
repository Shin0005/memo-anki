import { Card, Prisma } from '@prisma/client';

export interface ICardRepository {
  findByCardId(userId: string, deckId: bigint): Promise<Card | null>;
  findByCardname(userId: string, cardname: string): Promise<Card | null>;
  findCards(userId: string): Promise<Card[]>;
  createCard(
    userId: string,
    data: Prisma.CardUncheckedUpdateInput,
  ): Promise<Card>;
  deleteCard(userId: string, deckId: bigint): Promise<Card>;
  updateCard(
    userId: string,
    cardId: bigint,
    data: Prisma.CardUncheckedUpdateInput,
  ): Promise<Card>;
}

// DI用のトークン
export const ICardRepository = Symbol('ICardRepository');
