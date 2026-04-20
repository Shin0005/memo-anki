import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

// userIdは偽装される可能性があるのでdtoでは受け取らない
export class UpdateDeckRequest {
  @ApiProperty({ example: '1', description: 'bigint ID of the deck' })
  @IsNotEmpty()
  @IsNumberString()
  @Length(1, 19)
  deckId: string;

  @ApiProperty({ example: 'Updated Deck Name', maxLength: 50 })
  @NotBlank()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({ example: 'Updated description', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;
}
