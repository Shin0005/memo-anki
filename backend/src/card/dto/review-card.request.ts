import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import { ReviewRating } from '@memo-anki/shared';

/**
 * 復習採点リクエスト
 * - rating: 0=AGAIN, 1=HARD, 2=GOOD, 3=EASY
 * - version: 楽観ロック用。GET時のCardReviewResponse.versionをそのまま返送する想定
 */
export class ReviewCardRequest {
  @ApiProperty({
    enum: ReviewRating,
    enumName: 'ReviewRating',
    example: ReviewRating.GOOD,
    description: '0=AGAIN, 1=HARD, 2=GOOD, 3=EASY',
  })
  // IsEnum(ReviewRating) はキー名(string)も許してしまうので、明示的に数値値で縛る
  @IsIn([
    ReviewRating.AGAIN,
    ReviewRating.HARD,
    ReviewRating.GOOD,
    ReviewRating.EASY,
  ])
  rating: ReviewRating;

  @ApiProperty({ example: 0, description: '楽観ロック用のカードバージョン' })
  @IsInt()
  @Min(0)
  version: number;
}
