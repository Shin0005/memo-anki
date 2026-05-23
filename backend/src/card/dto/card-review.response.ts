import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Card } from '@prisma/client';
import { CardType } from '@memo-anki/shared';

/**
 * 採点ボタンに表示する次回復習時間(ms)のプレビュー。
 * フロントは "+1分" "+1日" などに整形して各ボタン内に表示する。
 * swaggerの都合でtypeでなくclassにして型共有する
 */
export class ReviewPreviewResponse {
  @ApiProperty({
    example: 60000,
    description: 'AGAINを押した時の次回待ち時間(ms)',
  })
  again: number;

  @ApiProperty({
    example: 600000,
    description: 'HARDを押した時の次回待ち時間(ms)',
  })
  hard: number;

  @ApiProperty({
    example: 3600000,
    description: 'GOODを押した時の次回待ち時間(ms)',
  })
  good: number;

  @ApiProperty({
    example: 86400000,
    description: 'EASYを押した時の次回待ち時間(ms)',
  })
  easy: number;
}

/** 復習キュー用レスポンス（楽観ロックのversionをフロントが採点時に返送する） */
export class CardReviewResponse {
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

  @ApiProperty({ example: 0, description: '0=NEW, 1=SHORT, 2=LONG' })
  queue: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  nextReviewAt: Date;

  @ApiProperty({ example: 0, description: '楽観ロック用バージョン' })
  version: number;

  // findReviewCards経由のときだけ詰める。
  @ApiPropertyOptional({ type: ReviewPreviewResponse })
  preview?: ReviewPreviewResponse;

  constructor(card: Card, preview?: ReviewPreviewResponse) {
    // FK PKはNOT NULL制約のため異常発生してもここに来る前にエラー
    this.id = card.id?.toString();
    this.deckId = card.deckId?.toString();
    this.name = card.name;
    this.type = card.type;
    this.content = card.content; // 明確にnullにしたい
    this.question = card.question; // 明確にnullにしたい
    this.answer = card.answer; // 明確にnullにしたい
    this.queue = card.queue;
    this.nextReviewAt = card.nextReviewAt;
    this.version = card.version;
    this.preview = preview;
  }
}
