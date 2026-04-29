import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

// userId は偽装される可能性があるので dto では受け取らない
// deckId は URL のパスパラメータから受け取るのでボディに含めない
export class UpdateDeckRequest {
  @ApiProperty({ example: 'Updated Deck Name', maxLength: 50 })
  @NotBlank()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({ example: 'Updated description', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  description?: string;
}
