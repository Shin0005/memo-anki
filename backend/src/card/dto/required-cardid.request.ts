import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, Length } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

export class RequiredCardIdRequest {
  @ApiProperty({ example: '1', description: 'bigint ID of the card' })
  @NotBlank()
  @IsNumberString()
  @Length(1, 19)
  cardId: string;
}
