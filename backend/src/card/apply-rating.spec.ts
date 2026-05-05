import { describe, it, expect } from 'vitest';
import { Card } from '@prisma/client';
import { CardQueue, CardType, ReviewRating } from '@memo-anki/shared';
import { applyRating } from './apply-rating';

/**
 * applyRating の遷移表テスト。
 *
 * Queue3つとRating4つによる合計12分岐の試験
 * 基本的に単純な計算ロジックなのでSM-2と同様、主に分岐の確認になる。
 *
 * 時刻はnowを引数注入できるので固定値で検証。
 */

const FIXED_NOW = new Date('2026-05-04T00:00:00.000Z');

// テスト用にCardを作るヘルパー
function makeCard(
  queue: CardQueue = CardQueue.NEW,
  repetition: number = 0,
  interval: number = 1,
  easeFactor: number = 2.5,
): Card {
  return {
    id: 1n,
    deckId: 10n,
    name: 'card',
    type: CardType.NOTE,
    content: 'c',
    question: null,
    answer: null,
    queue,
    repetition,
    interval,
    easeFactor,
    nextReviewAt: FIXED_NOW,
    version: 0,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };
}

// 期待ミリ秒差を `getTime` 比較で確かめるユーティリティ
function diffMs(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;

describe('applyRating', () => {
  describe('NEW queue', () => {
    const card = makeCard(CardQueue.NEW);

    it('AGAIN: NEWのまま+1分', () => {
      // [試験項目: NEW×AGAIN]
      const r = applyRating(card, ReviewRating.AGAIN, FIXED_NOW);
      expect(r.queue).toBe(CardQueue.NEW);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_MIN);
    });

    it('HARD: NEWのまま+10分', () => {
      // [試験項目: NEW×HARD]
      const r = applyRating(card, ReviewRating.HARD, FIXED_NOW);
      expect(r.queue).toBe(CardQueue.NEW);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(10 * ONE_MIN);
    });

    it('GOOD: SHORTへ昇格しrepetition=0、+1時間', () => {
      // [試験項目: NEW×GOOD]
      const r = applyRating(card, ReviewRating.GOOD, FIXED_NOW);
      expect(r.queue).toBe(CardQueue.SHORT);
      expect(r.repetition).toBe(0);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_HOUR);
    });

    it('EASY: LONGへ即昇格 repetition=1, interval=1, +1日', () => {
      // [試験項目: NEW×EASY]
      const r = applyRating(card, ReviewRating.EASY, FIXED_NOW);
      expect(r.queue).toBe(CardQueue.LONG);
      expect(r.repetition).toBe(1);
      expect(r.interval).toBe(1);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_DAY);
    });
  });

  describe('SHORT queue', () => {
    it('AGAIN: SHORTのまま+1分', () => {
      // [試験項目: SHORT×AGAIN]
      const r = applyRating(
        makeCard(CardQueue.SHORT),
        ReviewRating.AGAIN,
        FIXED_NOW,
      );
      expect(r.queue).toBe(CardQueue.SHORT);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_MIN);
    });

    it('HARD: SHORTのまま+10分', () => {
      // [試験項目: SHORT×HARD]
      const r = applyRating(
        makeCard(CardQueue.SHORT),
        ReviewRating.HARD,
        FIXED_NOW,
      );
      expect(r.queue).toBe(CardQueue.SHORT);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(10 * ONE_MIN);
    });

    it('GOOD(1回目): SHORT継続でrepetition=1, +1時間', () => {
      // [試験項目: SHORT×GOOD 1回目]
      const r = applyRating(
        makeCard(CardQueue.SHORT, 0),
        ReviewRating.GOOD,
        FIXED_NOW,
      );
      expect(r.queue).toBe(CardQueue.SHORT);
      expect(r.repetition).toBe(1);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_HOUR);
    });

    it('GOOD(2回目): LONGへ昇格 repetition=1/interval=1, +1日', () => {
      // [試験項目: SHORT×GOOD 2回目]
      const r = applyRating(
        makeCard(CardQueue.SHORT, 1),
        ReviewRating.GOOD,
        FIXED_NOW,
      );
      expect(r.queue).toBe(CardQueue.LONG);
      expect(r.repetition).toBe(1);
      expect(r.interval).toBe(1);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_DAY);
    });

    it('EASY: LONGへ即昇格', () => {
      // [試験項目: SHORT×EASY]
      const r = applyRating(
        makeCard(CardQueue.SHORT),
        ReviewRating.EASY,
        FIXED_NOW,
      );
      expect(r.queue).toBe(CardQueue.LONG);
      expect(r.interval).toBe(1);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_DAY);
    });
  });

  describe('LONG queue', () => {
    it('AGAIN: SHORTへ降格しrepetition=0, easeFactor減少(adjustEaseFactor委譲), +1分', () => {
      // [試験項目: LONG×AGAIN]
      // ease の具体的な減少幅と下限ガードは sm2.spec.ts でテストする。
      // ここでは「adjustEaseFactor が呼ばれて ease が下がっていること」だけを契約として確認する。
      const r = applyRating(
        makeCard(CardQueue.LONG, 5, 30, 2.5),
        ReviewRating.AGAIN,
        FIXED_NOW,
      );
      expect(r.queue).toBe(CardQueue.SHORT);
      expect(r.repetition).toBe(0);
      expect(r.easeFactor).toBeLessThan(2.5); // 減少していること（具体値はsm2.spec.tsで担保）
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_MIN);
    });

    it('HARD(interval=1): round(1.2)=1で+1日, easeFactor減少', () => {
      // [試験項目: LONG×HARD interval=1]
      // LONG昇格直後(interval=1)にHARDを押した場合、round(1*1.2)=1 で間隔は維持され +1日 になる。
      // 「1日待ったのに+30分」になる旧仕様の不整合を解消。
      const r = applyRating(
        makeCard(CardQueue.LONG, 1, 1, 2.5),
        ReviewRating.HARD,
        FIXED_NOW,
      );
      expect(r.queue).toBe(CardQueue.LONG);
      expect(r.interval).toBe(1);
      expect(r.easeFactor).toBeCloseTo(2.35); // 2.5 - 0.15
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(1 * ONE_DAY);
    });

    it('HARD(2回目以降): intervalを1.2倍に短縮し+日', () => {
      // [試験項目: LONG×HARD 既存]
      const r = applyRating(
        makeCard(CardQueue.LONG, 3, 10),
        ReviewRating.HARD,
        FIXED_NOW,
      );
      expect(r.interval).toBe(12); // 10 * 1.2
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(12 * ONE_DAY);
    });

    it('GOOD(rep=1→2): SM-2でinterval=6日', () => {
      // [試験項目: LONG×GOOD 2回目]
      const r = applyRating(
        makeCard(CardQueue.LONG, 1, 1, 2.5),
        ReviewRating.GOOD,
        FIXED_NOW,
      );
      expect(r.repetition).toBe(2);
      expect(r.interval).toBe(6);
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(6 * ONE_DAY);
    });

    it('GOOD(rep>=2): prevInterval * easeFactor', () => {
      // [試験項目: LONG×GOOD 通常]
      const r = applyRating(
        makeCard(CardQueue.LONG, 3, 6, 2.5),
        ReviewRating.GOOD,
        FIXED_NOW,
      );
      expect(r.repetition).toBe(4);
      expect(r.interval).toBe(15); // round(6 * 2.5)
    });

    it('EASY(interval=1): SM-2 rep=2固定値6日 × 1.3 = 8日, easeFactor上昇', () => {
      // [試験項目: LONG×EASY interval=1]
      // rep=1→2 で calcInterval(2, ...) は6日固定。easyボーナス×1.3で round(7.8)=8日。
      // GOOD(rep=1→2)の+6日より長くなり、GOOD/EASYの逆転が解消される。
      const r = applyRating(
        makeCard(CardQueue.LONG, 1, 1, 2.5),
        ReviewRating.EASY,
        FIXED_NOW,
      );
      expect(r.repetition).toBe(2);
      expect(r.interval).toBe(8);
      expect(r.easeFactor).toBeCloseTo(2.6); // 2.5 + 0.10
      expect(diffMs(r.nextReviewAt, FIXED_NOW)).toBe(8 * ONE_DAY);
    });

    it('EASY(rep>=2): SM-2 × 1.3', () => {
      // [試験項目: LONG×EASY 通常]
      const r = applyRating(
        makeCard(CardQueue.LONG, 2, 6, 2.5),
        ReviewRating.EASY,
        FIXED_NOW,
      );
      // easeFactor = 2.6, repetition=3, prevInterval=6 → SM2: round(6*2.6)=16, *1.3 → 21
      expect(r.repetition).toBe(3);
      expect(r.interval).toBe(21);
      expect(r.easeFactor).toBeCloseTo(2.6);
    });
  });
});
