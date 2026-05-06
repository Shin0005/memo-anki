import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { type components, ReviewRating } from '@memo-anki/shared';
import { useQuery } from '@tanstack/react-query';
import { useReviewMutation } from './useReviewMutation';

type Card = components['schemas']['CardReviewResponse'];

export type ReviewQueueState = {
  /** 現在表示中のカード。完了/ロード中は null。 */
  current: Card | null;
  finished: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** 採点して次のカードへ進める */
  rating: (rating: ReviewRating) => void;
};

/**
 * ReviewQueueの状態を管理
 */
export function useReviewCards(deckId: string): ReviewQueueState {
  // setIndex を呼ぶことで再レンダリングをトリガーし、表示カードを切り替える
  const [index, setIndex] = useState(0);

  // 採点APIの呼び出し
  const { reviewedCard } = useReviewMutation();

  // 復習対象カードを初回のみ取得する（採点後の再fetchは次フェーズで実装）
  const {
    data: cards = [],
    isLoading,
    isError,
    error,
  } = useQuery<Card[]>({
    queryKey: ['reviewQueue', deckId],
    queryFn: async () =>
      (await apiClient(`/card/review?deckId=${deckId}`, 'GET')) as Card[],

    // fetchタイミングは後で手動制御するためTanStack Queryの自動再fetchを無効化する。
    staleTime: Infinity,
  });

  // 現在表示中のカード（末尾を超えたら null）
  const current = cards[index] ?? null;

  // ロードしているときは完了ではない。取得したキューが0件の時は完了。indexが配列の最大値の時は完了。
  const finished = !isLoading && cards.length > 0 && index >= cards.length;

  return {
    current,
    finished,
    isLoading,
    isError,
    error,
    // 採点APIを呼び、次のカードへ進める
    rating: (r) => {
      // page.tsxでも防御しているが二重でガード
      if (!current) return;
      reviewedCard.mutate([
        current.id,
        { rating: r, version: current.version },
      ]);
      setIndex((i) => i + 1);
    },
  };
}
