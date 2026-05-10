// apiClient レベルでモックする。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { ReviewRating } from '@memo-anki/shared';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useReviewMutation } from './useReviewMutation';

// apiClient と sonner をモック
vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// 各テストで新しいQueryClientを作る (キャッシュ汚染を避ける)
const createWrapper = () => {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper };
};

beforeEach(() => {
  vi.mocked(apiClient).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('useReviewMutation', () => {
  // 正常系: 成功時にtoastが呼ばれない
  it('成功時はトーストを出さず isSuccess=true になる', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ id: 'card-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewMutation(), {
      wrapper: Wrapper,
    });

    result.current.reviewedCard.mutate([
      'card-1',
      { rating: ReviewRating.GOOD, version: 1 },
    ]);

    await waitFor(() =>
      expect(result.current.reviewedCard.isSuccess).toBe(true),
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  // 異常系はswitch分岐のテストになるので行わない。

  // ratingがnumberで送信されること
  it.each([
    ['AGAIN', ReviewRating.AGAIN, 0],
    ['HARD', ReviewRating.HARD, 1],
    ['GOOD', ReviewRating.GOOD, 2],
    ['EASY', ReviewRating.EASY, 3],
  ] as const)(
    '%s を渡すとRatingが %i(number) で送信される',
    async (_label, ratingEnum, expectedNumber) => {
      vi.mocked(apiClient).mockResolvedValueOnce({ id: 'card-1' });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useReviewMutation(), {
        wrapper: Wrapper,
      });

      result.current.reviewedCard.mutate([
        'card-1',
        { rating: ratingEnum, version: 7 },
      ]);

      await waitFor(() =>
        expect(result.current.reviewedCard.isSuccess).toBe(true),
      );

      // mockでURL/method/bodyをまとめて検証
      expect(apiClient).toHaveBeenCalledWith('/card/card-1/review', 'POST', {
        rating: expectedNumber,
        version: 7,
      });
      // ratingがnumberであることを確認
      const calledBody = vi.mocked(apiClient).mock.calls[0][2] as {
        rating: unknown;
      };
      expect(typeof calledBody.rating).toBe('number');
    },
  );

  // 正しいカードに対して採点が送られること
  it('採点APIのURLは /card/<cardId>/review でリクエストされる', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ id: '123456' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewMutation(), {
      wrapper: Wrapper,
    });

    result.current.reviewedCard.mutate([
      '123456',
      { rating: ReviewRating.GOOD, version: 42 },
    ]);

    await waitFor(() =>
      expect(result.current.reviewedCard.isSuccess).toBe(true),
    );
    expect(apiClient).toHaveBeenCalledWith(
      '/card/123456/review',
      'POST',
      expect.objectContaining({ version: 42 }),
    );
  });
});
