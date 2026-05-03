// トーストを出し分けるロジックと成功時にキャッシュを無効化するロジックを試験
// useDeckMutations / useAuthMutations は同じ構造なので、代表としてこれだけ書く。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import { useCardMutations } from './useCardMutations';

// apiClientとsonnerをモック
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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }, // retry: falseにすることで動作を軽くする。
  });
  // invalidateQueriesの呼び出しを監視するため、queryClientのメソッドをスパイに。
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  // .ts ファイルのままで使えるよう JSX を使わず createElement で Provider を組み立てる
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, invalidateSpy };
};

beforeEach(() => {
  vi.mocked(apiClient).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('useCardMutations', () => {
  // createCard正常終了
  it('createCard 成功時に cards キャッシュを無効化し成功トーストを出す', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ id: '1' });
    const { Wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useCardMutations(), {
      wrapper: Wrapper,
    });

    //mutationを実行
    result.current.createCard.mutate({
      deckId: '1',
      type: 0,
      name: 'test',
      content: 'hello',
    });

    // mutation 完了まで待つ
    await waitFor(() => expect(result.current.createCard.isSuccess).toBe(true));

    // cards キャッシュが破棄されたことを確認
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['cards'],
      exact: false,
    });
    expect(toast.success).toHaveBeenCalledWith('作成に成功しました');
  });

  // 以降異常系
  it('400 BAD_REQUEST のときバリデーション系トーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(
      new HttpError(400, 'validation failed'),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardMutations(), {
      wrapper: Wrapper,
    });

    result.current.createCard.mutate({
      deckId: '1',
      type: 0,
      name: '',
      content: '',
    });

    await waitFor(() => expect(result.current.createCard.isError).toBe(true));
    // toastがメッセージ通りに出ること
    expect(toast.error).toHaveBeenCalledWith('正しい形式で入力してください');
  });

  it('409 CONFLICT のとき重複エラートーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new HttpError(409, 'duplicate'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardMutations(), {
      wrapper: Wrapper,
    });

    result.current.createCard.mutate({
      deckId: '1',
      type: 0,
      name: 'dup',
      content: '',
    });

    await waitFor(() => expect(result.current.createCard.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(
      '同じ名前のカードが既に存在します',
    );
  });

  // エラー系: NOT_FOUND (404) は削除済みリソース等の分岐
  it('404 NOT_FOUND のとき「カードが見つかりません」トーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new HttpError(404, 'not found'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardMutations(), {
      wrapper: Wrapper,
    });

    result.current.deleteCard.mutate('999');

    await waitFor(() => expect(result.current.deleteCard.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('カードが見つかりません');
  });

  // エラー系: 想定外 HTTP エラー (例: 500) は汎用エラーで握る
  // フォールバック分岐の確認
  it('500 のとき汎用サーバーエラートーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(
      new HttpError(500, 'internal error'),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardMutations(), {
      wrapper: Wrapper,
    });

    result.current.createCard.mutate({
      deckId: '1',
      type: 0,
      name: 'x',
      content: '',
    });

    await waitFor(() => expect(result.current.createCard.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('サーバーエラーが発生しました');
  });

  // エラー系: HttpError ではない (= ネットワーク断やパース失敗) のときは別文言
  // err instanceof HttpError 分岐の else 経路
  it('HttpError 以外の例外のときネットワークエラートーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new Error('NetworkError'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardMutations(), {
      wrapper: Wrapper,
    });

    result.current.createCard.mutate({
      deckId: '1',
      type: 0,
      name: 'x',
      content: '',
    });

    await waitFor(() => expect(result.current.createCard.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(
      'ネットワークエラーが発生しました',
    );
  });
});
