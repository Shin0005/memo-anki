import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';
import { NotBlank } from '../../common/decorators/not-blank.decorator';

export class RegisterRequest {
  @ApiProperty({ example: 'john_doe', maxLength: 30 })
  @NotBlank('ユーザ名は必須です')
  @MaxLength(30, { message: '30文字以内で入力してください' })
  username: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 64 })
  @NotBlank('パスワードは必須です')
  @MinLength(8, { message: '8文字以上で入力してください' })
  @MaxLength(64, { message: '64文字未満で入力してください' })
  password: string;

  @ApiPropertyOptional({ example: 'john@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @MaxLength(255, { message: '255文字以内で入力してください' })
  email?: string;
}
