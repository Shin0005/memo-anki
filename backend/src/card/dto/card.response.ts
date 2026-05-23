import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Card } from '@prisma/client';
import { CardType } from '@memo-anki/shared';
/** 一覧表示用 */
export class CardResponse {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '1' })
  deckId: string;

  @ApiProperty({ example: 'My Card' })
  name: string;

  @ApiProperty({ enum: CardType, enumName: 'CardType', example: CardType.NOTE })
  type: CardType;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Card content here',
    nullable: true,
  })
  content: string | null;

  @ApiPropertyOptional({
    type: 'string',
    example: 'What is ...?',
    nullable: true,
  })
  question: string | null;

  @ApiPropertyOptional({
    type: 'string',
    example: 'The answer is ...',
    nullable: true,
  })
  answer: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  nextReviewAt: Date;

  constructor(card: Card) {
    // FK PKはNOT NULL制約のため異常発生してもここに来る前にエラー
    this.id = card.id?.toString();
    this.deckId = card.deckId?.toString();
    this.name = card.name;
    this.type = card.type;
    this.content = card.content; // 明確にnullにしたい
    this.question = card.question; // 明確にnullにしたい
    this.answer = card.answer; // 明確にnullにしたい
    this.updatedAt = card.updatedAt;
    this.nextReviewAt = card.nextReviewAt;
  }
}
