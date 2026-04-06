/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import * as jwt from 'jsonwebtoken';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthResponse } from '../../src/auth/dto/auth.response';

/**
 * JWTペイロードの型定義
 */
interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  // passwordが含まれていないことを検証するためにオプションで定義
  password?: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('2. E2E試験項目 (正常系)', () => {
    const registerData = {
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
    };

    it('登録: 正しいデータでの新規登録 (201)', async () => {
      // [試験項目: 201が返ること]
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

      // 2. DBのpwがhash化されていること（平文と一致しない）
      expect(user?.passwordHash).not.toBe(registerData.password);

      // 3. jwtをdecodeしてペイロードにpasswordがないこと（subのみ）
      const decoded = jwt.decode(body.accessToken) as JwtPayload;
      expect(decoded.sub).toBe(user?.id);
      expect(decoded.password).toBeUndefined();
    });

    it('ログイン: 正しいデータでの認証 (200)', async () => {
      // 事前登録
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

      // [試験項目: jwtが返却され、ペイロードにパスワードが入っていないこと]
      expect(body.accessToken).toBeDefined();
      const decoded = jwt.decode(body.accessToken) as JwtPayload;
      expect(decoded.password).toBeUndefined();
    });
  });

  describe('3. E2E試験項目 (異常系)', () => {
    it('登録: バリデーション - 不正な値での入力 (400)', async () => {
      // [試験項目: 400が返ること]
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: '', password: '12' })
        .expect(400);
    });

    it('登録: 重複チェック - 既に存在するusername (409)', async () => {
      // [試験項目: UsernameAlreadyExistException -> 409]
      const data = { username: 'dup', password: 'password123' };
      await request(app.getHttpServer()).post('/auth/register').send(data);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(data)
        .expect(409);
    });

    it('登録: 重複チェック - 既に存在するemail (409)', async () => {
      // [試験項目: UserEmailAlreadyExistException -> 409]
      const data1 = {
        username: 'user_a',
        email: 'same@example.com',
        password: 'password123',
      };
      const data2 = {
        username: 'user_b',
        email: 'same@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/register').send(data1);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(data2)
        .expect(409);
    });

    it('ログイン: 認証失敗 - 誤った認証データ (401)', async () => {
      // [試験項目: jwtが発行されないこと、401が返ること]
      const data = { username: 'auth_fail_user', password: 'password123' };
      await request(app.getHttpServer()).post('/auth/register').send(data);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'auth_fail_user', password: 'wrong_password' })
        .expect(401);

      // res.bodyをPartialでキャストして安全にプロパティアクセス
      const body = res.body as Partial<AuthResponse>;
      expect(body.accessToken).toBeUndefined();
    });
  });

  describe('4. Guard / Strategy 試験項目 (認可)', () => {
    let validToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'guard', password: 'password123' });
      const body = res.body as AuthResponse;
      validToken = body.accessToken;
    });

    it('tokenあり → 保護API成功 (200)', async () => {
      await request(app.getHttpServer())
        .get('/deck')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('tokenなし → 401', async () => {
      await request(app.getHttpServer()).get('/deck').expect(401);
    });

    it('不正token → 401', async () => {
      await request(app.getHttpServer())
        .get('/deck')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });
});
