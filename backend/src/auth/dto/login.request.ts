import { MaxLength } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

export class LoginRequest {
  @NotBlank('ユーザ名は必須です')
  @MaxLength(30, { message: '30文字以内で入力してください' })
  username: string;

  @NotBlank('パスワードは必須です')
  @MaxLength(64, { message: '64文字未満で入力してください' })
  password: string;
}
