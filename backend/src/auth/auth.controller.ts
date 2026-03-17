import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth.response';
import { LoginRequest } from './dto/login.request';
import { RegisterRequest } from './dto/register.request';

// 時間があればusername, passwordの変更削除機能を追加する
@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() request: RegisterRequest) {
    const response: AuthResponse = await this.authService.register(request);
    // 今後intercepterでフォーマット形成してresponseのjsonを返す。
    return response;
  }

  @Post('login')
  async login(@Body() request: LoginRequest) {
    const response: AuthResponse = await this.authService.login(request);
    // 今後intercepterでフォーマット形成してresponsejsonを返す。
    return response;
  }
}
