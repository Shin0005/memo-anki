import { IsNumberString, Length } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

export class RequiredCardIdRequest {
  @NotBlank()
  @IsNumberString()
  @Length(1, 19) // bigint想定で長さ19以内に指定。
  cardId: string;
}
