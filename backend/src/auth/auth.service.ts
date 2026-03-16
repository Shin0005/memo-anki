import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from '@prisma/client';
import { AuthResponse } from './dto/auth.response';
import { LoginRequest } from './dto/login.request';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { RegisterRequest } from './dto/register.request';

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

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
   * @param dto
   * @returns
   */
  async register(request: RegisterRequest) {
    // 重複チェック
    if (!(await this.validUsername(request.username))) throw new Error(); // 重複例外を別途作成

    if (request.email !== undefined && request.email !== null) {
      if (!(await this.validEmail(request.email))) throw new Error(); // 重複例外を別途作成
    }

    // Requestから内部Dtoへ変換
    const dto: CreateUserDto = {
      username: request.username,
      password: request.password,
      email: request.email,
    };

    // ユーザ登録
    const user: User = await this.userService.create(dto);
    // Token発行
    const accessToken = '';

    // responseに変換
    return new AuthResponse(user.username, accessToken, user.email);
  }

  /**
   * ログイン処理
   * 現時点でusernameとpasswordで認証
   * @param request
   * @returns
   */
  async login(request: LoginRequest) {
    // requestのusernameの存在確認
    const user: User | null = await this.userService.findByUsername(
      request.username,
    );
    if (!user) throw new Error(); // NotFound例外を別途作成

    //認証
    const isMatch = await bcrypt.compare(request.password, user.passwordHash);
    if (!isMatch) throw new Error(); // 認証失敗例外を別途作成

    // Token発行
    const accessToken = '';
    return new AuthResponse(user.username, accessToken, user.email);
  }
}
