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
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
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

    it('正常系: 新規登録が成功し、UserService.createが呼ばれること', async () => {
      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(null);
      userServiceMock.create.mockResolvedValue(mockUser);

      jwtServiceMock.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      await service.register(registerDto);

      // ★ 修正：完全一致 → 部分一致
      expect(userServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: registerDto.username,
          password: registerDto.password,
          email: registerDto.email,
        }),
      );
    });

    it('異常系: usernameが重複している場合に例外が飛ぶこと', async () => {
      userServiceMock.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        UsernameAlreadyExistException,
      );

      expect(userServiceMock.create).not.toHaveBeenCalled();
    });

    it('異常系: emailが重複している場合に例外が飛ぶこと', async () => {
      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        UserEmailAlreadyExistException,
      );
    });

    it('ロジック: パスワードがそのまま渡されること', async () => {
      // 1. bcrypt.hash をモック化 (Error: data and salt... を防ぐ)
      const bcrypt = await import('bcrypt');
      vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_rt' as never);

      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(null);
      userServiceMock.create.mockResolvedValue(mockUser);

      // 2. sign が 2回値を返すように設定 (accessToken, refreshToken)
      jwtServiceMock.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      await service.register(registerDto);

      expect(userServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: registerDto.password,
        }),
      );
    });

    it('トークン発行: 登録成功時にjwtService.signが2回呼ばれること', async () => {
      userServiceMock.findByUsername.mockResolvedValue(null);
      userServiceMock.findByEmail.mockResolvedValue(null);
      userServiceMock.create.mockResolvedValue(mockUser);

      jwtServiceMock.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      await service.register(registerDto);

      // 回数検証
      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);

      // 最低限のpayload確認
      expect(jwtServiceMock.sign).toHaveBeenCalledWith(
        { sub: mockUser.id },
        expect.any(Object),
      );
    });
  });
  // --- 2. login ---
  describe('login', () => {
    const loginDto: LoginRequest = {
      username: 'testuser',
      password: 'correct_password',
    };

    it('正常系: 認証が成功し、結果が返ること', async () => {
      userServiceMock.findByUsername.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);

      jwtServiceMock.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const result = await service.login(loginDto);

      expect(result.username).toBe(mockUser.username);
      expect(result.email).toBe(mockUser.email);

      // ★ 修正：tokens構造
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('access_token');
    });

    it('異常系: ユーザーが存在しない場合', async () => {
      userServiceMock.findByUsername.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        LoginFailedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Username');
    });

    it('異常系: パスワード不一致', async () => {
      userServiceMock.findByUsername.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        LoginFailedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Password');
    });

    it('トークン発行: 認証成功時にsignが2回呼ばれること', async () => {
      userServiceMock.findByUsername.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);

      jwtServiceMock.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      await service.login(loginDto);

      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);
      expect(jwtServiceMock.sign).toHaveBeenCalledWith(
        { sub: mockUser.id },
        expect.any(Object),
      );
    });
  });

  // --- 3. generateTokens ---
  describe('generateTokens', () => {
    it('正常系: トークン生成され、signが2回呼ばれること', async () => {
      jwtServiceMock.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const spy = vi
        .spyOn(service, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      const result = await service.generateTokens('user-uuid-123');

      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);
      expect(jwtServiceMock.sign).toHaveBeenCalledWith(
        { sub: 'user-uuid-123' },
        expect.any(Object),
      );

      expect(spy).toHaveBeenCalledWith('user-uuid-123', 'refresh_token');

      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });
  });

  // --- 4. updateRefreshToken ---
  describe('updateRefreshToken', () => {
    it('正常系: ハッシュ化されDB更新されること', async () => {
      const mockHash = 'hashed_rt';
      const bcrypt = await import('bcrypt'); //?
      vi.spyOn(bcrypt, 'hash').mockResolvedValue(mockHash as never);

      userServiceMock.updateRefreshToken.mockResolvedValue(mockUser);

      await service.updateRefreshToken('user-uuid-123', 'plain_rt');

      expect(bcrypt.hash).toHaveBeenCalled();

      expect(userServiceMock.updateRefreshToken).toHaveBeenCalledWith(
        'user-uuid-123',
        expect.objectContaining({
          refreshTokenHash: mockHash,
          refreshTokenExpiresAt: expect.any(Date) as unknown as Date,
        }),
      );
    });
  });

  // --- 5. refresh ---
  describe('refresh', () => {
    const refreshToken = 'valid_refresh_token';

    it('正常系: リフレッシュ成功し新しいトークンが返ること', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-123',
      } as any);

      userServiceMock.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: 'hashed_rt',
        refreshTokenExpiresAt: new Date(),
      });

      mockedCompare.mockResolvedValue(true);

      jwtServiceMock.sign
        .mockReturnValueOnce('new_access')
        .mockReturnValueOnce('new_refresh');

      const result = await service.refresh(refreshToken);

      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('new_access');
      expect(result.refreshToken).toBe('new_refresh');
    });

    it('異常系: トークン不正（verify失敗）', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error());

      await expect(service.refresh(refreshToken)).rejects.toThrow();
    });

    it('異常系: payloadにsubが無い', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({} as any);

      await expect(service.refresh(refreshToken)).rejects.toThrow();
    });

    it('異常系: userが存在しない', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-123',
      } as any);

      userServiceMock.findById.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow();
    });

    it('異常系: RTが未設定', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-123',
      } as any);

      userServiceMock.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      } as any);

      await expect(service.refresh(refreshToken)).rejects.toThrow();
    });

    it('異常系: RT不一致', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-123',
      } as any);

      userServiceMock.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: 'hashed_rt',
        refreshTokenExpiresAt: new Date(),
      });

      mockedCompare.mockResolvedValue(false);

      await expect(service.refresh(refreshToken)).rejects.toThrow();
    });
  });
});
