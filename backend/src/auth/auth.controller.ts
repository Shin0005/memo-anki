import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth.response';
import { RefreshResponse } from './dto/refresh.response';
import { LoginRequest } from './dto/login.request';
import { RegisterRequest } from './dto/register.request';
import express from 'express';

// 時間があればusername, passwordの変更削除機能を追加する
@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiResponse({ status: 201, type: AuthResponse })
  async register(
    @Body() request: RegisterRequest,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.register(request);

    // リフレッシュトークンをCookieに隠す
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return new AuthResponse(
      result.username,
      result.tokens.accessToken,
      result.email,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: AuthResponse })
  async login(
    @Body() request: LoginRequest,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.login(request);

    // リフレッシュトークンをCookieに隠す
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return new AuthResponse(
      result.username,
      result.tokens.accessToken, // RTを返すとメモリに保存されて大事故
      result.email,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie('refresh_token', { path: '/' });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: RefreshResponse })
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    // cookieの存在チェック（バリデーション）
    const oldRefreshToken = req.cookies['refresh_token'] as string | undefined;
    if (!oldRefreshToken) throw new UnauthorizedException();

    // Serviceで検証と再発行（RTのpayloadにuseridが含まれる）
    const { accessToken, refreshToken } =
      await this.authService.refresh(oldRefreshToken);

    // 新しいリフレッシュトークンをCookieに上書き
    this.setRefreshTokenCookie(res, refreshToken);

    return new RefreshResponse(accessToken);
  }

  /**
   * CookieにrefreshTokenをセットする
   * @param res
   * @param token リフレッシュトークン
   */
  private setRefreshTokenCookie(res: express.Response, token: string) {
    res.cookie('refresh_token', token, {
      // XSS対策でjsにcookieを取得させない
      httpOnly: true,
      // 開発中はhttpを使うのでfalse, デプロイはhttpsなのでtrue
      // httpでtrueだと、loginしてもtokenが登録されない
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // CSRF対策はATをcookieに置くため未設定
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    });
  }
}
