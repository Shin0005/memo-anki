// Notionインポート実行フックの単体試験(POST引数 / 成功時のcards無効化・完了トースト / エラー委譲)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import { useNotionImport } from './useNotionImport';

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// 各テストで新しい QueryClient を作る (キャッシュ汚染を避ける)
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, invalidateSpy };
};

beforeEach(() => {
  vi.mocked(apiClient).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('useNotionImport', () => {
  it('成功時に import POST を正しい引数で叩き、cards を無効化し完了トーストを出す', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ count: 3 });
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useNotionImport(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      databaseId: 'db 1', // encode 確認のため空白を含める
      deckId: 'deck-1',
      columnName: 'Content',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // databaseId が URL エンコードされ、body は deckId/columnName のみ
    expect(apiClient).toHaveBeenCalledWith(
      '/integrations/notion/databases/db%201/import',
      'POST',
      { deckId: 'deck-1', columnName: 'Content' },
    );
    // 取り込んだカードを一覧へ反映
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['cards'],
      exact: false,
    });
    expect(toast.success).toHaveBeenCalledWith('インポートが完了しました');
  });

  it('失敗時は共通エラーハンドラに委譲し、cards 無効化も完了トーストも起きない', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new HttpError(500, 'imp'));
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useNotionImport(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      databaseId: 'db-1',
      deckId: 'deck-1',
      columnName: 'Content',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // 共通ハンドラ(useNotionErrorHandler)経由でエラートーストが出る
    expect(toast.error).toHaveBeenCalledWith('imp');
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['cards'],
      exact: false,
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
