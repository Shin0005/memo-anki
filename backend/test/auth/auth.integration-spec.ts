/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthResponse } from '../../src/auth/dto/auth.response';
import cookieParser from 'cookie-parser';
import { customValidationPipe } from '../../src/common/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../../src/common/filters/global.exception.filter';

// NestJSの標準的なエラーレスポンス型
interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: { field: string; message: string }[]; // バリデーションエラー時のみ存在
  timestamp: string;
  path: string;
}

describe('Auth (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // main.tsに合わせる
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(customValidationPipe);
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.use(cookieParser());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('2. 結合試験項目 (正常系)', () => {
    const registerData = {
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
    };

    it('登録: 正しいデータでの新規登録 (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      const body = res.body as AuthResponse;

      // 1. DBにUserレコードが作成されること
      const user = await prisma.user.findUnique({
        where: { username: registerData.username },
      });
      expect(user).toBeDefined();

      // 2. DBのpasswordHashが平文と一致しないこと
      expect(user?.passwordHash).not.toBe(registerData.password);

      // 3. レスポンスにaccessTokenが含まれること
      expect(body.accessToken).toBeDefined();

      // 4. Cookieにrefresh_tokenが設定され、httpOnly: true, sameSite: 'lax'が含まれること
      const cookies = res.get('Set-Cookie') ?? [];
      const cookieString = Array.isArray(cookies) ? cookies.join() : cookies;
      expect(cookieString).toContain('refresh_token');
      expect(cookieString).toMatch(/HttpOnly/i);
      expect(cookieString).toMatch(/SameSite=Lax/i);
    });

    it('ログイン: 正しいデータでの認証 (200)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: registerData.username,
          password: registerData.password,
        })
        .expect(200);

      const body = res.body as AuthResponse;

      expect(body.accessToken).toBeDefined();
      expect(body).not.toHaveProperty('refreshToken');

      const cookies = res.get('Set-Cookie') ?? [];
      const cookieString = Array.isArray(cookies) ? cookies.join() : cookies;
      expect(cookieString).toContain('refresh_token');
      expect(cookieString).toMatch(/HttpOnly/i);
      expect(cookieString).toMatch(/SameSite=Lax/i);
    });

    it('リフレッシュ: 正常なトークン更新 (200)', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData);

      const cookie = registerRes.headers['set-cookie'];

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookie)
        .expect(200);

      const body = res.body as AuthResponse;
      expect(body.accessToken).toBeDefined();

      const cookies = res.get('Set-Cookie') ?? [];
      const cookieString = Array.isArray(cookies) ? cookies.join() : cookies;
      expect(cookieString).toContain('refresh_token');
    });
  });

  describe('3. 結合試験項目 (異常系・バリデーション)', () => {
    it('入力チェック: バリデーションエラー (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: '', password: '12' })
        .expect(400);

      // anyエラー回避のためにキャスト
      const body = res.body as ErrorResponse;
      console.log('Actual Body:', res.body);
      expect(body.message).toBeDefined();
      // フィルタの実装通り、詳細なエラーは 'errors' プロパティが配列であることを確認
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors!.length).toBeGreaterThan(0);
    });

    it('重複チェック: 既存usernameでの登録 (409)', async () => {
      const data = {
        username: 'dup',
        password: 'password123',
        email: 'dup@example.com',
      };
      await request(app.getHttpServer()).post('/auth/register').send(data);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(data)
        .expect(409);

      const body = res.body as ErrorResponse;
      expect(body.statusCode).toBe(409);
    });

    it('ログイン失敗: 誤った認証情報 (401)', async () => {
      const data = {
        username: 'fail_user',
        password: 'password123',
        email: 'fail@example.com',
      };
      await request(app.getHttpServer()).post('/auth/register').send(data);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'fail_user', password: 'wrong_password' })
        .expect(401);
    });

    it('更新失敗: Cookieなし (401)', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('更新失敗: 不正トークン (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid'])
        .expect(401);
    });
  });

  describe('4. Guard / Strategy 試験項目 (認可)', () => {
    let validToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'guard_user',
          password: 'password123',
          email: 'guard@example.com',
        });
      const body = res.body as AuthResponse;
      validToken = body.accessToken;
    });

    it('認可制御: 有効なトークンあり (200)', async () => {
      await request(app.getHttpServer())
        .get('/deck')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('アクセス拒否: トークンなし (401)', async () => {
      await request(app.getHttpServer()).get('/deck').expect(401);
    });

    it('アクセス拒否: 不正なトークン (401)', async () => {
      await request(app.getHttpServer())
        .get('/deck')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });
});
