import { type components, ReviewRating } from '@memo-anki/shared';

type Card = components['schemas']['CardResponse'];

export type ReviewQueueState = {
  /** 現在表示中のカード。完了/ロード中は null。 */
  current: Card | null;
  /** 0-indexed の現在位置 */
  index: number;
  /** 復習対象の総数 */
  total: number;
  /** すべて完了したか */
  finished: boolean;
  isLoading: boolean;
  error: unknown;
  /** 採点して次のカードへ進める */
  rating: (rating: ReviewRating) => void;
};

export function useReviewQueue(deckId: number): ReviewQueueState {
  // 追加
  console.log('[stub] useReviewQueue', deckId);
  return {
    current: null,
    index: 0,
    total: 0,
    finished: false,
    isLoading: false,
    error: null,
    rating: (r) => console.log('[stub] rating', r),
  };
}
