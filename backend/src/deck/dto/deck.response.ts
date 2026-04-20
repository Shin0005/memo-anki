import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Deck } from '@prisma/client';

export class DeckResponse {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'My Deck' })
  name: string;

  @ApiPropertyOptional({ example: 'A deck for studying' })
  description?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  constructor(deck: Deck) {
    this.id = String(deck.id);
    this.name = deck.name;
    this.description = deck.description ?? undefined;
    this.createdAt = deck.createdAt;
  }
}
