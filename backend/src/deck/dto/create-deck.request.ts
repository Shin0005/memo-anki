import { IsOptional, IsString, Length } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

export class CreateDeckRequest {
  @NotBlank()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;
}
