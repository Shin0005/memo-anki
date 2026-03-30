import { IsNumberString, IsOptional, IsString, Length } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

// typeとdeckIdは変更させない
export class UpdateCardRequest {
  @NotBlank()
  @IsNumberString()
  @Length(1, 19) // bigint想定で長さ19以内に指定。
  cardId: string;

  @NotBlank()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content: string | undefined;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  question: string | undefined;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  answer: string | undefined;
}
