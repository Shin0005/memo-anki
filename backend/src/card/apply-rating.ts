import { Card } from '@prisma/client';
import { CardQueue, ReviewRating } from '@memo-anki/shared';
import { adjustEaseFactor, calcInterval } from './sm2';

/*
  現在のカード状態と採点から次の状態を計算する

  キュータイプは、NEW, SHORT, LONGの三種類あり、
  それぞれにratingのAGAIN, HARD, GOOD, EASYの4種類がある。
  つまり合計12種類の分岐がある。
  
  構造としては、キュータイプによる大分類→ratingによる小分類となっている。
*/

// 時間定数（ミリ秒）
const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;

export type ReviewUpdate = {
  queue: number;
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReviewAt: Date;
  intervalMs: number; // 採点プレビュー用の採点間隔
};

/**
 * 現在のカード状態と採点から次の状態を計算する
 *
 * - SM-2はLongのみを対象であり、その他は定数での変更になっている。
 * - SM-2系の数値計算（ease調整・interval計算）は sm2.ts に分離している。
 * @param card 採点対象のカード
 * @param rating ユーザの採点（AGAIN/HARD/GOOD/EASY）
 * @param now 現在時刻（テスト用）
 */
export function applyRating(
  card: Card,
  rating: ReviewRating,
  now: Date = new Date(), // テスト用
): ReviewUpdate {
  // キュータイプごとに異なる状態変化を設定
  // Prismaが生成するqueueはnumber型なので、enum型に明示変換してswitchの安全性を保つ
  const queue: CardQueue = card.queue;
  switch (queue) {
    case CardQueue.NEW:
      return applyToNew(card, rating, now);
    case CardQueue.SHORT:
      return applyToShort(card, rating, now);
    case CardQueue.LONG:
      return applyToLong(card, rating, now);
    default:
      // 想定外のqueue値が来た場合は現状維持（防御的）。実運用では発生しない想定。
      return {
        queue: card.queue,
        repetition: card.repetition,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReviewAt: card.nextReviewAt,
        intervalMs: 0, // 状態が変わらない＝待ち時間も伸びないので0
      };
  }
}

/**
 * NEW(初見)の状態変化
 * - AGAIN/HARDはNEWのまま短時間で再出題
 * - GOODでSHORTへ昇格（NEWではrepetitionは0不変）
 * - EASYで一気にLONGへ
 */
function applyToNew(card: Card, rating: ReviewRating, now: Date): ReviewUpdate {
  switch (rating) {
    case ReviewRating.AGAIN:
      // nextReviewAtを"1分後"に設定
      return {
        queue: CardQueue.NEW,
        repetition: card.repetition,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 1 * ONE_MIN),
        intervalMs: 1 * ONE_MIN,
      };
    case ReviewRating.HARD:
      // nextReviewAtを"10分後"に設定
      return {
        queue: CardQueue.NEW,
        repetition: card.repetition,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 10 * ONE_MIN),
        intervalMs: 10 * ONE_MIN,
      };
    case ReviewRating.GOOD:
      // SHORTへ昇格。repetitionをリセット。nextReviewAtを"1時間後"に設定
      return {
        queue: CardQueue.SHORT,
        repetition: 0,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 1 * ONE_HOUR),
        intervalMs: 1 * ONE_HOUR,
      };
    case ReviewRating.EASY:
      // LONGへ即昇格。SM-2の初期状態(rep=1, interval=1)に揃える。nextReviewAtを"1日後"に設定
      return {
        queue: CardQueue.LONG,
        repetition: 1,
        interval: 1,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 1 * ONE_DAY),
        intervalMs: 1 * ONE_DAY,
      };
  }
}

/**
 * SHORT(短期復習)の状態変化
 * - AGAIN/HARDはNEWと同じ
 * - GOODは1回目でrepetition += 1。2回目のgood(=rep>=2)でLONGへ昇格
 * - EASYは即LONG昇格
 */
function applyToShort(
  card: Card,
  rating: ReviewRating,
  now: Date,
): ReviewUpdate {
  switch (rating) {
    case ReviewRating.AGAIN:
      // nextReviewAtを"1分後"に設定
      return {
        queue: CardQueue.SHORT,
        repetition: card.repetition,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 1 * ONE_MIN),
        intervalMs: 1 * ONE_MIN,
      };
    case ReviewRating.HARD:
      // nextReviewAtを"10分後"に設定
      return {
        queue: CardQueue.SHORT,
        repetition: card.repetition,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 10 * ONE_MIN),
        intervalMs: 10 * ONE_MIN,
      };
    case ReviewRating.GOOD: {
      const nextRep = card.repetition + 1;
      // 2回目のgoodでLONG昇格。SM-2の初期状態(rep=1, interval=1)に揃える。
      // nextReviewAtを"1日後"に設定
      if (nextRep >= 2) {
        return {
          queue: CardQueue.LONG,
          repetition: 1,
          interval: 1,
          easeFactor: card.easeFactor,
          nextReviewAt: addMs(now, 1 * ONE_DAY),
          intervalMs: 1 * ONE_DAY,
        };
      }
      // 1回目のgoodでrepetition += 1, nextReviewAtを"1時間後"に設定
      return {
        queue: CardQueue.SHORT,
        repetition: nextRep,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 1 * ONE_HOUR),
        intervalMs: 1 * ONE_HOUR,
      };
    }
    case ReviewRating.EASY:
      // SM-2の初期状態(rep=1, interval=1)に揃える。nextReviewAtを"1日後"に設定
      return {
        queue: CardQueue.LONG,
        repetition: 1,
        interval: 1,
        easeFactor: card.easeFactor,
        nextReviewAt: addMs(now, 1 * ONE_DAY),
        intervalMs: 1 * ONE_DAY,
      };
  }
}

/**
 * LONG(長期復習)の状態変化
 * - SM-2を適用
 * - AGAIN: SHORTへ降格しパラメータリセット。easeFactorは大きく下がる
 * - HARD: Intervalを短縮(×1.2)
 * - GOOD: SM-2のcalcIntervalで再スケジュール
 * - EASY: Interval × 1.3
 *
 * easeFactorの調整は adjustEaseFactor、interval計算は calcInterval（sm2.ts）に委譲。
 */
function applyToLong(
  card: Card,
  rating: ReviewRating,
  now: Date,
): ReviewUpdate {
  switch (rating) {
    case ReviewRating.AGAIN: {
      const ef = adjustEaseFactor(card.easeFactor, ReviewRating.AGAIN);
      // SHORTへ降格、repetition=0/interval=1にリセット。easeFactor減少。nextReviewAtを"1分後"に設定
      return {
        queue: CardQueue.SHORT,
        repetition: 0,
        interval: 1,
        easeFactor: ef,
        nextReviewAt: addMs(now, 1 * ONE_MIN),
        intervalMs: 1 * ONE_MIN,
      };
    }
    case ReviewRating.HARD: {
      const ef = adjustEaseFactor(card.easeFactor, ReviewRating.HARD);
      const nextInterval = Math.max(1, Math.round(card.interval * 1.2));
      // 間隔を1.2倍に短縮（Anki流hard処理）、easeFactor減少。nextReviewAtを"nextInterval日後"に設定
      // interval=1 のときは round(1.2)=1 となり +1日 に丸まる
      return {
        queue: CardQueue.LONG,
        repetition: card.repetition,
        interval: nextInterval,
        easeFactor: ef,
        nextReviewAt: addMs(now, nextInterval * ONE_DAY),
        intervalMs: nextInterval * ONE_DAY,
      };
    }
    case ReviewRating.GOOD: {
      const ef = adjustEaseFactor(card.easeFactor, ReviewRating.GOOD);
      const nextRep = card.repetition + 1;
      const nextInterval = calcInterval(nextRep, card.interval, ef);
      // efが変化しないためintervalはsm-2のデフォルトに準拠。repetition += 1。nextReviewAtを"nextInterval日後"に設定
      return {
        queue: CardQueue.LONG,
        repetition: nextRep,
        interval: nextInterval,
        easeFactor: ef,
        nextReviewAt: addMs(now, nextInterval * ONE_DAY),
        intervalMs: nextInterval * ONE_DAY,
      };
    }
    case ReviewRating.EASY: {
      const ef = adjustEaseFactor(card.easeFactor, ReviewRating.EASY);
      const nextRep = card.repetition + 1;
      const sm2 = calcInterval(nextRep, card.interval, ef);
      const nextInterval = Math.max(1, Math.round(sm2 * 1.3));
      // SM-2 × 1.3 (easyボーナス)、easeFactor上昇。nextReviewAtを"nextInterval日後"に設定
      return {
        queue: CardQueue.LONG,
        repetition: nextRep,
        interval: nextInterval,
        easeFactor: ef,
        nextReviewAt: addMs(now, nextInterval * ONE_DAY),
        intervalMs: nextInterval * ONE_DAY,
      };
    }
  }
}

/** Dateにミリ秒を加算した新しいDateを返す（不変） */
function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}
