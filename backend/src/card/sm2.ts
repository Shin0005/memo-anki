import { ReviewRating } from '@memo-anki/shared';

/**
 * SM-2 アルゴリズムの数値計算部分を独立させたモジュール。
 *
 * - apply-rating.ts から呼び出される。queue遷移には関与しない純粋な数値ロジックのみ。
 * - 単体でテスト容易になるよう、ease調整とinterval計算を別関数に分離している。
 */

// easeFactor の下限（1.3はsm-2における経験則値）
export const MIN_EASE_FACTOR = 1.3;

/**
 * 採点に応じた次のeaseFactorを返す。下限MIN_EASE_FACTORで制限。
 * - AGAIN: -0.20
 * - HARD : -0.15
 * - GOOD : 変更なし
 * - EASY : +0.10
 * @param prevEf 採点反映前のeaseFactor (preventEasefactor)
 * @param rating 採点
 */
export function adjustEaseFactor(prevEf: number, rating: ReviewRating): number {
  switch (rating) {
    case ReviewRating.AGAIN:
      return Math.max(MIN_EASE_FACTOR, prevEf - 0.2);
    case ReviewRating.HARD:
      return Math.max(MIN_EASE_FACTOR, prevEf - 0.15);
    case ReviewRating.GOOD:
      return prevEf; // goodでは変えない
    case ReviewRating.EASY:
      return prevEf + 0.1;
  }
}

/**
 * 次回intervalを計算
 *
 * 戻り値は日数で日付はapply-ratingで決定
 * @param repetition 採点反映後の repetition
 * @param prevInterval "直前"の interval（日）
 * @param easefactor 採点反映後の easeFactor
 * @returns Interval （日）
 */
export function calcInterval(
  repetition: number,
  prevInterval: number,
  easeFactor: number,
): number {
  // repetition <= 1 → 1日
  // repetition === 2 → 6日
  //それ以外 → 直前のinterval × easeFactor を四捨五入
  if (repetition <= 1) return 1;

  if (repetition === 2) return 6;

  // 最小1日を担保
  return Math.max(1, Math.round(prevInterval * easeFactor));
}
