import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  UserService,
  CreateUserInput,
  UpdateRefreshTokenInput,
} from '../user/user.service';
import { User } from '@prisma/client';

import { LoginRequest } from './dto/login.request';
import * as bcrypt from 'bcrypt';
import { RegisterRequest } from './dto/register.request';
import { JwtService } from '@nestjs/jwt';
import {
  LoginFailedException,
  UserEmailAlreadyExistException,
  UsernameAlreadyExistException,
} from '../common/exceptions/domain.exceptions';

interface JwtPayload {
  sub: string; // userId
  iat: number; // 発行時刻(自動付与)
  exp: number; // 執行時刻 (自動付与)
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 既存のusernameがないか検索する
   * 該当するusernameがある場合にfalseを返す
   * @param username
   * @returns boolean
   */
  private async validUsername(username: string) {
    const isUsername = await this.userService.findByUsername(username);
    return !isUsername;
  }
  /**
   * 既存のemailがないか検索する
   * 該当するemailがある場合にfalseを返す
   * @param email
   * @returns boolean
   */
  private async validEmail(email: string) {
    const isEmail = await this.userService.findByEmail(email);
    return !isEmail;
  }

  /**
   * 各トークンを作成する
   */
  async generateTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // zustand用, moduleの定義を上書き
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // httpOnlyCookie用
    });
    // リフレッシュトークンをハッシュ化してDBに保存
    await this.updateRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * DBのリフレッシュトークンを更新
   */
  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    // 現在時刻から7日間の期限を設定
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const input: UpdateRefreshTokenInput = {
      refreshTokenHash: hash,
      refreshTokenExpiresAt: expiresAt,
    };
    await this.userService.updateRefreshToken(userId, input);
  }

  /**
   * 登録処理
   * 重複確認後に登録処理を行う。
   * @param request
   * @returns ATとユーザ情報
   */
  async register(request: RegisterRequest) {
    // 重複チェック
    if (!(await this.validUsername(request.username)))
      throw new UsernameAlreadyExistException(request.username);

    if (request.email !== undefined && request.email !== null) {
      if (!(await this.validEmail(request.email)))
        throw new UserEmailAlreadyExistException(request.email);
    }

    // Userの契約に合わせたオブジェクトを作成
    const userInput: CreateUserInput = {
      username: request.username,
      password: request.password,
      email: request.email,
    };

    // ユーザ登録
    const user: User = await this.userService.create(userInput);
    // Token発行（ペイロードに内部識別子id）
    const tokens = await this.generateTokens(user.id);
    return {
      username: user.username,
      email: user.email,
      tokens,
    };
  }

  /**
   * ログイン処理
   * 現時点でusernameとpasswordで認証
   * @param request
   * @returns 各tokenとuser情報
   */
  async login(request: LoginRequest) {
    // requestのusernameの存在確認
    const user: User | null = await this.userService.findByUsername(
      request.username,
    );
    if (!user) throw new LoginFailedException('Username');
    //認証
    const isMatch = await bcrypt.compare(request.password, user.passwordHash);
    if (!isMatch) throw new LoginFailedException('Password');
    // 各Token発行
    const tokens = await this.generateTokens(user.id);

    return {
      username: user.username,
      email: user.email,
      tokens,
    };
  }

  /**
   * リフレッシュ
   * 送られたrefreshTokenが認証された場合にtokenの組を返す
   * @param userID
   * @param refreshToken
   */
  async refresh(refreshToken: string) {
    // トークンのデコード(認証と期限確認)
    let payload: JwtPayload;
    //
    // trycatchを一時的に実装しているが、ブランチ終了後にfilterに実装を移動する。
    //
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken); // jsonで返るのでinterface(typeでも可)で定義
    } catch {
      // 不正なjwtのときに投げられるJsonWebTokenError等を401に変換
      throw new UnauthorizedException();
    }
    if (!payload || !payload.sub) throw new UnauthorizedException();

    // userが存在しない、またはRTとその期限が存在しないときはエラー
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt)
      throw new UnauthorizedException();

    // requestとDBを照合(悪用を防ぐ)
    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) throw new UnauthorizedException('Invalid RefreshToken');

    return this.generateTokens(user.id);
  }
}
