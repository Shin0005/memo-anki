import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, Length } from 'class-validator';

// userIdは偽装される可能性があるのでdtoでは受け取らない
export class RequiredDeckIdRequest {
  @ApiProperty({ example: '1', description: 'bigint ID of the deck' })
  @IsNotEmpty()
  @IsNumberString()
  @Length(1, 19)
  deckId: string;
}
