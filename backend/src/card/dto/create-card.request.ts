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
  @NotBlank()
  @IsNumberString()
  @Length(1, 19) // bigint想定で長さ19以内に指定。
  deckId: string;

  @NotBlank()
  @Length(1, 50)
  name: string;

  @IsNumber()
  @IsIn([0, 1]) // note=0, quiz=1
  type: number;

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
