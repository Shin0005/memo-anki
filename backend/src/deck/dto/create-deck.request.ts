import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

export class CreateDeckRequest {
  @ApiProperty({ example: 'My Deck', maxLength: 50 })
  @NotBlank()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({ example: 'A deck for studying', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;
}
