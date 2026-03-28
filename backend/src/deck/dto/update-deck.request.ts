import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { NotBlank } from 'src/common/decorators/not-blank.decorator';

// userIdは偽装される可能性があるのでdtoでは受け取らない
export class UpdateDeckRequest {
  @IsNotEmpty()
  @IsNumberString() //bigintも対応
  @Length(1, 19) // bigint想定で長さ19以内に指定。
  deckId: string;

  @NotBlank()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;
}
