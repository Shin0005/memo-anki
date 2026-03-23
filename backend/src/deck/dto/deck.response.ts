import { Deck } from '@prisma/client';

export class DeckResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;

  constructor(deck: Deck) {
    this.id = String(deck.id);
    this.name = deck.name;
    this.description = deck.description ?? undefined;
    this.createdAt = deck.createdAt;
  }
}
