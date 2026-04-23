/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import * as jwt from 'jsonwebtoken';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthResponse } from '../../src/auth/dto/auth.response';
import { CardResponse } from '../../src/card/dto/card.response';

interface JwtPayload {
  sub: string;
}

describe('Card (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let userADeckId: string;
  let userBDeckId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // 19桁のBigInt文字列を扱うためのtransform設定
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // データのクリーニング
    await prisma.user.deleteMany();

    // ユーザーAのセットアップ
    const resA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'userA', password: 'password123' });
    userAToken = (resA.body as AuthResponse).accessToken;
    userAId = (jwt.decode(userAToken) as JwtPayload).sub;

    const deckA = await prisma.deck.create({
      data: { userId: userAId, name: 'User A Deck' },
    });
    userADeckId = deckA.id.toString();

    // ユーザーBのセットアップ
    const resB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'userB', password: 'password123' });
    userBToken = (resB.body as AuthResponse).accessToken;
    userBId = (jwt.decode(userBToken) as JwtPayload).sub;

    const deckB = await prisma.deck.create({
      data: { userId: userBId, name: 'User B Deck' },
    });
    userBDeckId = deckB.id.toString();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('2. 正常系シナリオ (CRUD)', () => {
    it('Create: NOTE形式の作成 - DBに作成され、q/aがnullであること', async () => {
      // [試験項目: NOTE形式の作成]
      const res = await request(app.getHttpServer())
        .post('/card')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          deckId: userADeckId,
          name: 'Test Note',
          type: 0,
          content: 'Some content',
          question: 'Should be null',
          answer: 'Should be null',
        })
        .expect(201);

      const body = res.body as CardResponse;

      // DB検証
      const dbCard = await prisma.card.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbCard).not.toBeNull();
      expect(dbCard?.name).toBe('Test Note');
      expect(dbCard?.type).toBe(0);
      expect(dbCard?.question).toBeNull(); // 強制nullの検証
      expect(dbCard?.answer).toBeNull(); // 強制nullの検証
    });

    it('Create: QUIZ形式の作成 - DBに作成され、contentがnullであること', async () => {
      // [試験項目: QUIZ形式の作成]
      const res = await request(app.getHttpServer())
        .post('/card')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          deckId: userADeckId,
          name: 'Test Quiz',
          type: 1,
          content: 'Should be null',
          question: 'What is 1+1?',
          answer: '2',
        })
        .expect(201);

      const body = res.body as CardResponse;

      // DB検証
      const dbCard = await prisma.card.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbCard).not.toBeNull();
      expect(dbCard?.content).toBeNull(); // 強制nullの検証
      expect(dbCard?.question).toBe('What is 1+1?');
    });

    it('Get: 自分のカード一覧取得 - レスポンスとDBの値が一致すること', async () => {
      // [試験項目: 自分のカード一覧取得]
      const createdCard = await prisma.card.create({
        data: {
          deckId: BigInt(userADeckId),
          name: 'DB Card',
          type: 0,
          content: 'Text',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/card')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const body = res.body as CardResponse[];
      expect(body.length).toBe(1);

      // 各フィールドがDBの値と一致することの検証
      expect(body[0].id).toBe(createdCard.id.toString());
      expect(body[0].name).toBe(createdCard.name);
      expect(body[0].content).toBe(createdCard.content);
    });

    it('Get: データの分離確認 - 他ユーザーのカードが含まれないこと', async () => {
      // [試験項目: データの分離確認]
      await prisma.card.create({
        data: { deckId: BigInt(userADeckId), name: 'A', type: 0 },
      });
      await prisma.card.create({
        data: { deckId: BigInt(userBDeckId), name: 'B', type: 0 },
      });

      const res = await request(app.getHttpServer())
        .get('/card')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const body = res.body as CardResponse[];
      expect(body.every((c) => c.deckId === userADeckId)).toBe(true);
      expect(body.find((c) => c.name === 'B')).toBeUndefined();
    });

    it('Update: NOTE形式の更新 - DBが更新され、q/aがnullを維持すること', async () => {
      // [試験項目: NOTE形式の更新]
      const card = await prisma.card.create({
        data: {
          deckId: BigInt(userADeckId),
          name: 'Old',
          type: 0,
          content: 'Old',
        },
      });

      await request(app.getHttpServer())
        .put(`/card/${card.id.toString()}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'New Name',
          content: 'New Content',
          question: 'Hacker question',
        })
        .expect(200);

      // DB検証
      const dbCard = await prisma.card.findUnique({ where: { id: card.id } });
      expect(dbCard?.name).toBe('New Name');
      expect(dbCard?.content).toBe('New Content');
      expect(dbCard?.question).toBeNull(); // nullを維持
    });

    it('Update: QUIZ形式の更新 - DBが更新され、contentがnullを維持すること', async () => {
      // [試験項目: QUIZ形式の更新]
      const card = await prisma.card.create({
        data: {
          deckId: BigInt(userADeckId),
          name: 'Quiz',
          type: 1,
          question: 'Q',
          answer: 'A',
        },
      });

      await request(app.getHttpServer())
        .put(`/card/${card.id.toString()}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Updated Quiz',
          content: 'Should be ignored',
          question: 'New Q',
        })
        .expect(200);

      // DB検証
      const dbCard = await prisma.card.findUnique({ where: { id: card.id } });
      expect(dbCard?.content).toBeNull(); // nullを維持
      expect(dbCard?.question).toBe('New Q');
    });

    it('Delete: カードの削除 - DBから削除され再取得できないこと', async () => {
      // [試験項目: カードの削除]
      const card = await prisma.card.create({
        data: { deckId: BigInt(userADeckId), name: 'Bye', type: 0 },
      });

      await request(app.getHttpServer())
        .delete(`/card/${card.id.toString()}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      // DBから対象レコードが削除されていることの検証
      const dbCard = await prisma.card.findUnique({ where: { id: card.id } });
      expect(dbCard).toBeNull();
    });
  });

  describe('3. 異常系・境界値シナリオ', () => {
    it('名称の重複: 同一デッキ内で既存の名前を指定 (409)', async () => {
      // [試験項目: 異常系 名前重複]
      await prisma.card.create({
        data: { deckId: BigInt(userADeckId), name: 'Existing', type: 0 },
      });

      await request(app.getHttpServer())
        .post('/card')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ deckId: userADeckId, name: 'Existing', type: 0 })
        .expect(409);
    });

    it('認可: 他人のデッキにカードを作成 (404)', async () => {
      // [試験項目: 認可 他人デッキへの作成]
      await request(app.getHttpServer())
        .post('/card')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ deckId: userBDeckId, name: 'Malicious', type: 0 })
        .expect(404);
    });

    it('認可: 他人のカードを更新 (404)', async () => {
      // [試験項目: 認可 他人リソースの操作]
      const cardB = await prisma.card.create({
        data: { deckId: BigInt(userBDeckId), name: 'UserB Card', type: 0 },
      });

      await request(app.getHttpServer())
        .put(`/card/${cardB.id.toString()}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('認可: ログインなしでアクセス (401)', async () => {
      // [試験項目: 認可 未認証アクセス]
      await request(app.getHttpServer()).get('/card').expect(401);
    });

    it('バリデーション: 不正なボディパラメータ (400)', async () => {
      // [試験項目: ボディバリデーション代表例]
      await request(app.getHttpServer())
        .post('/card')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ deckId: 'abc', name: '', type: 99 }) // 全て不正
        .expect(400);
    });

    it('バリデーション: PUT時に非数字のパスパラメータ (400)', async () => {
      // [試験項目: パスパラメータバリデーション (PUT)]
      await request(app.getHttpServer())
        .put('/card/abc')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Test' })
        .expect(400);
    });

    it('バリデーション: DELETE時に非数字のパスパラメータ (400)', async () => {
      // [試験項目: パスパラメータバリデーション (DELETE)]
      await request(app.getHttpServer())
        .delete('/card/abc')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);
    });
  });
});
