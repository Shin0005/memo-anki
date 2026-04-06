/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// e2eでは外部ライブラリの型定義が複雑になるためanyととらえられることを防ぐ。
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest'; // デフォルトインポートを使用
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('DeckController (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const userA = {
    id: 'user-123',
    username: 'testuser_a', // 必須かつUnique
    email: 'userA@example.com',
    passwordHash: 'hashed_password_string', // カラム名に合わせる
  };
  const userB = {
    id: 'user-456',
    username: 'testuser_b',
    email: 'userB@example.com',
    passwordHash: 'hashed_password_string',
  };
  let tokenA: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // バリデーションエラー(400)を検証するために必須
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // すでに存在する場合のエラーを避けるため、一度消すか upsert を使う
    await prisma.user.upsert({
      where: { id: userA.id },
      update: {},
      create: userA,
    });
    await prisma.user.upsert({
      where: { id: userB.id },
      update: {},
      create: userB,
    });
    tokenA = jwtService.sign({ sub: userA.id, email: userA.email });
  });

  beforeEach(async () => {
    // テストごとにDBをクリーンアップ
    await prisma.deck.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('E2E試験項目 (正常系)', () => {
    it('POST: デッキ作成成功', async () => {
      const payload = { name: 'New Deck', description: 'Desc' };
      const res = await request(app.getHttpServer())
        .post('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(payload)
        .expect(HttpStatus.CREATED);

      const dbDeck = await prisma.deck.findFirst({
        where: { name: payload.name },
      });
      expect(dbDeck).toBeDefined();
      expect(res.body.id).toBe(dbDeck?.id.toString());
    });

    it('GET: 全件取得成功', async () => {
      await prisma.deck.create({ data: { name: 'D1', userId: userA.id } });
      const res = await request(app.getHttpServer())
        .get('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveLength(1);
    });

    it('GET: 他者データの分離', async () => {
      await prisma.deck.create({ data: { name: 'Mine', userId: userA.id } });
      await prisma.deck.create({ data: { name: 'Others', userId: userB.id } });

      const res = await request(app.getHttpServer())
        .get('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Mine');
    });

    it('PUT: デッキ更新成功', async () => {
      const target = await prisma.deck.create({
        data: { name: 'Before', userId: userA.id },
      });

      await request(app.getHttpServer())
        .put('/deck') // Controller定義に合わせてPut
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ deckId: target.id.toString(), name: 'After' })
        .expect(HttpStatus.OK);

      const updated = await prisma.deck.findUnique({
        where: { id: target.id },
      });
      expect(updated?.name).toBe('After');
    });

    it('DELETE: デッキ削除成功', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Bye', userId: userA.id },
      });

      await request(app.getHttpServer())
        .delete('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ deckId: deck.id.toString() })
        .expect(HttpStatus.NO_CONTENT);

      const deleted = await prisma.deck.findUnique({ where: { id: deck.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('E2E試験項目 (異常系・その他)', () => {
    it('共通: 認証エラー', async () => {
      await request(app.getHttpServer())
        .get('/deck')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('共通: バリデーション', async () => {
      await request(app.getHttpServer())
        .post('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: '' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('POST: 名称重複エラー', async () => {
      await prisma.deck.create({
        data: { name: 'Duplicate', userId: userA.id },
      });

      await request(app.getHttpServer())
        .post('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Duplicate' })
        .expect(HttpStatus.CONFLICT);
    });

    it('PUT: 他者デッキ更新', async () => {
      const otherDeck = await prisma.deck.create({
        data: { name: 'Other', userId: userB.id },
      });

      await request(app.getHttpServer())
        .put('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ deckId: otherDeck.id.toString(), name: 'Hack' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('DELETE: 他者デッキ削除', async () => {
      const otherDeck = await prisma.deck.create({
        data: { name: 'Other', userId: userB.id },
      });

      await request(app.getHttpServer())
        .delete('/deck')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ deckId: otherDeck.id.toString() })
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
