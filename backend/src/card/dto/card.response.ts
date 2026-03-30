import { Card } from '@prisma/client';

export class CardResponse {
  cardId: string;

  deckId: string;
  userId: string;
  name: string;
  type: number;
  content: string | null;
  question: string | null;
  answer: string | null;
  updatedAt: Date;

  constructor(card: Card) {
    // FK PKはNOT NULL制約のため異常発生してもここに来る前にエラー
    this.cardId = card.id?.toString();
    this.deckId = card.deckId?.toString();
    this.userId = card.userId;
    this.name = card.name;
    this.type = card.type;
    this.content = card.content; // 明確にnullにしたい
    this.question = card.question; // 明確にnullにしたい
    this.answer = card.answer; // 明確にnullにしたい
  }
}
