'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type components, ReviewRating } from '@memo-anki/shared';
import { useReviewMutation } from './useReviewMutation';
import { shouldFetch } from '../lib/shouldFetch';
import { mergeQueue } from '../lib/mergeQueue';
import { fetchReviewQueue } from '../api/getReviewQueue';

type Card = components['schemas']['CardReviewResponse'];

export type ReviewQueueState = {
  /** 現在表示中のカード。完了/ロード中は null。 */
  current: Card | null;
  finished: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** 採点して次のカードへ進める */
  rating: (rating: ReviewRating) => Promise<void>;
};

/**
 * ReviewQueueの状態を管理
 */
export function useReviewCards(deckId: string): ReviewQueueState {
  // 初回fetchはuseQueryに任せる(ロード状態・エラー状態の管理はTanStack Queryの責務)
  const {
    data: initialQueue,
    dataUpdatedAt,
    isLoading,
    isError,
    error,
  } = useQuery<Card[]>({
    queryKey: ['reviewQueue', deckId],
    queryFn: () => fetchReviewQueue(deckId),
    staleTime: Infinity, // データを「古い」と判定させない=自動再fetchしない
    gcTime: 0, // 画面離脱時にキャッシュ破棄
    refetchOnWindowFocus: false, // ウィンドウ復帰時に再fetchしない
  });

  // 採点・マージで独自にキューを変形するためローカルstateで上書きする
  // 初回はnullで二回目以降はuseQueryで取得したqueueをここに代入
  const [localQueue, setLocalQueue] = useState<Card[] | null>(null);

  // 再レンダリング不要な値はrefで管理する
  /** 最終fetch時刻 この値が20sを累積で超えたら再fetch */
  const lastFetchAt = useRef<number>(0);
  const isRating = useRef(false); // 採点フラグ(連打送信防止)

  // 初回fetch完了時刻をuseQueryのlastFetchAtに同期（累積時間で判断）
  useEffect(() => {
    if (dataUpdatedAt) {
      lastFetchAt.current = dataUpdatedAt;
    }
  }, [dataUpdatedAt]);

  const { reviewedCard } = useReviewMutation();

  /** 表示用のキュー: 初回はinitialQueue、二回目以降はlocalQueue */
  const queue = localQueue ?? initialQueue ?? [];
  /** 現在表示中のカード */
  const current = queue[0] ?? null;
  // ロード完了後にキューが空になった時点で完了
  const finished = !isLoading && !isError && queue.length === 0;

  // ReviewLayoutが再レンダリングされるとratingが再生成され参照がずれる。
  // そのためuseCallbackで参照ずれを防止。
  /** 採点時に呼び出される関数 */
  const rating = useCallback(
    async (r: ReviewRating): Promise<void> => {
      if (queue.length === 0) return;
      if (isRating.current) return; // 採点ロック確認
      isRating.current = true; // 採点ロック設定

      const head = queue[0];

      // 先頭のCard以外取り出してstateに保存
      const nextQueue = queue.slice(1);
      // 次のqueueを待たず次のカードへ進める
      setLocalQueue(nextQueue);

      try {
        // 採点API呼び出し
        await reviewedCard.mutateAsync([
          head.id,
          { rating: r, version: head.version },
        ]);

        // fetch条件
        if (shouldFetch(nextQueue, lastFetchAt.current)) {
          try {
            const newCards = await fetchReviewQueue(deckId);
            //mergeQueueで合成したQueueを保存（関数形式によりawaitによる参照ずれを防ぐ）
            setLocalQueue((prev) => mergeQueue(prev ?? nextQueue, newCards));
          } finally {
            lastFetchAt.current = Date.now();
          }
        }
      } catch {
        // 握りつぶす。
        // 採点失敗: useReviewMutationのonErrorがtoastを表示する
        // fetch失敗: サイレントに継続する(残存キューで復習を続ける)
      } finally {
        isRating.current = false;
      }
    },
    [queue, deckId, reviewedCard],
  );

  return { current, finished, isLoading, isError, error, rating };
}
