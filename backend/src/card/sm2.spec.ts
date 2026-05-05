import { describe, it, expect } from 'vitest';
import { ReviewRating } from '@memo-anki/shared';
import { adjustEaseFactor, calcInterval, MIN_EASE_FACTOR } from './sm2';

/**
 * SM-2の単体テスト
 *
 * ratingごとのease調整、パラメータから導出される次intervalの検証する。
 * 基本的に単純な計算ロジックなので主に分岐の確認になる。
 */

//
// adjustEaseFactor
//
describe('adjustEaseFactor', () => {
  it('AGAIN: easeFactorが0.20減少すること', () => {
    // [試験項目: AGAIN調整]
    expect(adjustEaseFactor(2.5, ReviewRating.AGAIN)).toBeCloseTo(2.3);
  });

  it('HARD: easeFactorが0.15減少すること', () => {
    // [試験項目: HARD調整]
    expect(adjustEaseFactor(2.5, ReviewRating.HARD)).toBeCloseTo(2.35);
  });

  it('GOOD: easeFactorが据え置かれること', () => {
    // [試験項目: GOOD据え置き]
    expect(adjustEaseFactor(2.5, ReviewRating.GOOD)).toBeCloseTo(2.5);
  });

  it('EASY: easeFactorが0.10増加すること', () => {
    // [試験項目: EASY増加]
    expect(adjustEaseFactor(2.5, ReviewRating.EASY)).toBeCloseTo(2.6);
  });

  it('下限ガード: AGAINでも下限(MIN_EASE_FACTOR=1.3)を下回らないこと', () => {
    // [試験項目: AGAIN下限]
    // 1.3 - 0.20 = 1.1 だが、1.3でクランプされる
    expect(adjustEaseFactor(MIN_EASE_FACTOR, ReviewRating.AGAIN)).toBeCloseTo(
      MIN_EASE_FACTOR,
    );
  });

  it('下限ガード: HARDでも下限(MIN_EASE_FACTOR=1.3)を下回らないこと', () => {
    // [試験項目: HARD下限]
    // 1.4 - 0.15 = 1.25 だが、1.3でクランプされる
    expect(adjustEaseFactor(1.4, ReviewRating.HARD)).toBeCloseTo(
      MIN_EASE_FACTOR,
    );
  });
});

//
// calcInterval
//
describe('calcInterval', () => {
  // SM-2標準の3分岐を全て押さえる
  it('repetition=0(範囲外想定): 1日を返すこと', () => {
    // [試験項目: rep=0]
    // rep<=1を1日に丸める仕様（rep=0は通常呼ばれないが境界として確認）
    expect(calcInterval(0, 1, 2.5)).toBe(1);
  });

  it('repetition=1: 1日を返すこと（rep<=1の境界）', () => {
    // [試験項目: rep=1]
    expect(calcInterval(1, 1, 2.5)).toBe(1);
  });

  it('repetition=2: 6日を返すこと（rep===2の固定値）', () => {
    // [試験項目: rep=2]
    // prevIntervalやefに依存しないSM-2標準の固定値
    expect(calcInterval(2, 1, 2.5)).toBe(6);
    expect(calcInterval(2, 999, 1.3)).toBe(6);
  });

  it('repetition>=3: prevInterval × easeFactor を四捨五入すること', () => {
    // [試験項目: rep>=3 通常]
    // 6 * 2.5 = 15
    expect(calcInterval(3, 6, 2.5)).toBe(15);
    // 15 * 2.6 = 39
    expect(calcInterval(4, 15, 2.6)).toBe(39);
    // 四捨五入: 10 * 1.35 = 13.5 → 14
    expect(calcInterval(3, 10, 1.35)).toBe(14);
  });

  // クランプ
  it('repetition>=3: 計算結果が0以下になっても最小1日を担保すること', () => {
    // [試験項目: 最小1日ガード]
    // ef=0.4, prev=1 → 0.4 → round → 0。最小1日へ補正。
    // 実運用では ef は MIN_EASE_FACTOR=1.3 以上なので発生しないが、純関数として防御的にテスト。
    expect(calcInterval(3, 1, 0.4)).toBe(1);
  });
});
