import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, Length } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

// typeとdeckIdは変更させない
export class UpdateCardRequest {
  @ApiProperty({ example: '1', description: 'bigint ID of the card' })
  @NotBlank()
  @IsNumberString()
  @Length(1, 19)
  cardId: string;

  @ApiProperty({ example: 'Updated Card Name', maxLength: 50 })
  @NotBlank()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({ example: 'Updated content', maxLength: 10000 })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content: string | undefined;

  @ApiPropertyOptional({ example: 'Updated question?', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  question: string | undefined;

  @ApiPropertyOptional({ example: 'Updated answer', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  answer: string | undefined;
}
