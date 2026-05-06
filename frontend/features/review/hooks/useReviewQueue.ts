// 復習キュー取得・採点送信のプレースホルダ Hook。
// API 接続時にユーザー側で実装する想定。
//
// 使い方の例:
//   const { current, total, index, rating, isLoading } = useReviewQueue(deckId);

import { type components, ReviewRating } from '@memo-anki/shared';

// CardResponse をこのhook内で使いやすい名前にする
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
  // TODO:
  //  - GET /decks/:deckId/review でキュー取得
  //  - POST /cards/:cardId/review { rating } で採点送信
  //  - 採点完了時に内部 index を進め、最後まで行ったら finished = true
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
