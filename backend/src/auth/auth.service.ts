import { Injectable } from '@nestjs/common';
import { UserService, CreateUserInput } from '../user/user.service';
import { User } from '@prisma/client';
import { AuthResponse } from './dto/auth.response';
import { LoginRequest } from './dto/login.request';
import * as bcrypt from 'bcrypt';
import { RegisterRequest } from './dto/register.request';
import { JwtService } from '@nestjs/jwt';
import {
  LoginFailedException,
  UserEmailAlreadyExistException,
  UserIdAlreadyExistException,
} from '../common/exceptions/domain.exceptions';

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
   * 登録処理
   * 重複確認後に登録処理を行う。
   * @param request
   * @returns AuthResponse
   */
  async register(request: RegisterRequest) {
    // 重複チェック
    if (!(await this.validUsername(request.username)))
      throw new UserIdAlreadyExistException(request.username);

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
    const accessToken = this.jwtService.sign({ sub: user.id });
    return new AuthResponse(user.username, accessToken, user.email);
  }

  /**
   * ログイン処理
   * 現時点でusernameとpasswordで認証
   * @param request
   * @returns AuthResponse
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
    // Token発行
    const accessToken = this.jwtService.sign({ sub: user.id });
    return new AuthResponse(user.username, accessToken, user.email);
  }
}
