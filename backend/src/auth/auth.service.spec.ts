/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import {
  LoginFailedException,
  UserEmailAlreadyExistException,
  UsernameAlreadyExistException,
} from '../common/exceptions/domain.exceptions';
import { RegisterRequest } from './dto/register.request';
import { LoginRequest } from './dto/login.request';
import { User } from '@prisma/client';

// bcyrptには二つのcompareがあり、オーバーロードされた関数はvi.mockで型推論が
// 壊れやすく、tsの最後のオーバーロードを選択する仕様と相まって壊れていた。
// そのためhoistedを用いて、あらかじめ型を定義したモック関数を作成した。
const mockedCompare = vi.hoisted(() => {
  // ここで [string | Buffer, string] を受け取り Promise<boolean> を返す型を指定
  return vi.fn<
    (data: string | Buffer, encrypted: string) => Promise<boolean>
  >();
});

// モジュール全体をモック化し、compareだけ自作のモックを割り当てる
vi.mock('bcrypt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcrypt')>();
  return {
    ...actual,
    compare: mockedCompare,
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let userServiceMock: DeepMockProxy<UserService>;
  let jwtServiceMock: DeepMockProxy<JwtService>;

  const mockUser: User = {
    id: 'user-uuid-123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    userServiceMock = mockDeep<UserService>();
    jwtServiceMock = mockDeep<JwtService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    vi.clearAllMocks();
  });

  // --- 1. register ---
  describe('register', () => {
    const registerDto: RegisterRequest = {
      username: 'newuser',
      password: 'password123',
      email: 'new@example.com',
    };

    it('正常系: 新規登録が成功し、UserService.createが正しい引数で呼ばれること', async () => {
      // [試験項目 1.1/1.7] 重複がなく、UserService.createが呼ばれること
      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(null);
      userServiceMock.create.mockResolvedValue(mockUser);
      jwtServiceMock.sign.mockReturnValue('mock_access_token');

      await service.register(registerDto);

      expect(userServiceMock.create).toHaveBeenCalledWith({
        username: registerDto.username,
        password: registerDto.password,
        email: registerDto.email,
      });
    });

    it('異常系: usernameが重複している場合に例外が飛ぶこと', async () => {
      // [試験項目 1.4] 既存ユーザーが存在する場合、UsernameAlreadyExistExceptionを投げる
      userServiceMock.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        UsernameAlreadyExistException,
      );
      // createが呼ばれていないことも確認
      expect(userServiceMock.create).not.toHaveBeenCalled();
    });

    it('異常系: emailが重複している場合に例外が飛ぶこと', async () => {
      // [試験項目 1.5] emailが入力され、かつ重複がある場合、UserEmailAlreadyExistExceptionを投げる
      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        UserEmailAlreadyExistException,
      );
    });

    it('ロジック: パスワード保護（UserServiceへ平文が渡されていることの確認）', async () => {
      // [試験項目 1.6] Service内ではハッシュ化せず、UserService.createの引数としてパスワードを渡しているか
      // ※実際のハッシュ化はUserServiceの責務であることを確認する試験
      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(null);
      userServiceMock.create.mockResolvedValue(mockUser);

      await service.register(registerDto);

      expect(userServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: registerDto.password, // 平文のまま渡されていること（UserService側でハッシュ化されるため）
        }),
      );
    });

    it('トークン発行: 登録成功時にjwtService.signが呼ばれること', async () => {
      // [試験項目 1.8]
      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(null);
      userServiceMock.create.mockResolvedValue(mockUser);

      await service.register(registerDto);

      expect(jwtServiceMock.sign).toHaveBeenCalledWith({ sub: mockUser.id });
    });
  });

  // --- 2. login ---
  describe('login', () => {
    const loginDto: LoginRequest = {
      username: 'testuser',
      password: 'correct_password',
    };

    it('正常系: 認証が成功し、AuthResponseが返ること', async () => {
      // [試験項目 2.5] bcrypt.compareが真を返し、レスポンスが返る
      userServiceMock.findByUsername.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      jwtServiceMock.sign.mockReturnValue('mock_access_token');

      const result = await service.login(loginDto);

      expect(result.username).toBe(mockUser.username);
      expect(result.accessToken).toBe('mock_access_token');
    });

    it('異常系: ユーザーが存在しない場合にLoginFailedException(Username)が飛ぶこと', async () => {
      // [試験項目 2.3]
      userServiceMock.findByUsername.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        LoginFailedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Username');
    });

    it('異常系: パスワードが一致しない場合にLoginFailedException(Password)が飛ぶこと', async () => {
      // [試験項目 2.4]
      userServiceMock.findByUsername.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        LoginFailedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Password');
    });

    it('トークン発行: 認証成功時に正しいペイロードで署名されること', async () => {
      // [試験項目 2.6]
      userServiceMock.findByUsername.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);

      await service.login(loginDto);

      expect(jwtServiceMock.sign).toHaveBeenCalledWith({ sub: mockUser.id });
    });
  });
});
