import { IsNotEmpty, IsNumberString, Length } from 'class-validator';

// userIdは偽装される可能性があるのでdtoでは受け取らない
export class RequiredDeckIdRequest {
  @IsNotEmpty()
  @IsNumberString() //bigintも対応
  @Length(1, 19) // bigint想定で長さ19以内に指定。
  deckId: string;
}
