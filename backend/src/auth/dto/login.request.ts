import { IsString, MaxLength } from 'class-validator';

export class LoginRequest {
  @IsString()
  @MaxLength(30)
  username: string;

  @IsString()
  @MaxLength(64)
  password: string;
}
