import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

export class CreateCardRequest {
  @ApiProperty({ example: '1', description: 'bigint ID of the deck' })
  @NotBlank()
  @IsNumberString()
  @Length(1, 19)
  deckId: string;

  @ApiProperty({ example: 'My Card', maxLength: 50 })
  @NotBlank()
  @Length(1, 50)
  name: string;

  @ApiProperty({ example: 0, description: '0=note, 1=quiz', enum: [0, 1] })
  @IsNumber()
  @IsIn([0, 1])
  type: number;

  @ApiPropertyOptional({ example: 'Card content here', maxLength: 10000 })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content: string | undefined;

  @ApiPropertyOptional({ example: 'What is ...?', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  question: string | undefined;

  @ApiPropertyOptional({ example: 'The answer is ...', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  answer: string | undefined;
}
