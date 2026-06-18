// Notion系API共通エラーハンドラの単体試験(分岐網羅: 再連携要求 / メッセージ / 汎用)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import {
  useNotionErrorHandler,
  NOTION_REAUTH_REQUIRED_CODE,
} from './useNotionErrorHandler';
import { NOTION_STATUS_QUERY_KEY } from './useNotionStatus';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// QueryClientを毎回新規に作り、invalidateQueriesの呼び出しを監視する
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
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('useNotionErrorHandler', () => {
  it('再連携要求(NOTION_REAUTH_REQUIRED)のとき連携状態を無効化しメッセージを表示する', () => {
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useNotionErrorHandler(), {
      wrapper: Wrapper,
    });

    result.current(
      new HttpError(403, '再連携が必要です', NOTION_REAUTH_REQUIRED_CODE),
    );

    // 連携状態(status)が再取得されること
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: NOTION_STATUS_QUERY_KEY,
    });
    // バックエンドのメッセージをそのまま表示する
    expect(toast.error).toHaveBeenCalledWith('再連携が必要です');
  });

  it('HttpError(再連携要求以外)のとき status は無効化せずメッセージをそのまま表示する', () => {
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useNotionErrorHandler(), {
      wrapper: Wrapper,
    });

    result.current(new HttpError(404, 'データベースが見つかりません'));

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('データベースが見つかりません');
  });

  it('HttpError以外(通信断等)のとき汎用メッセージを表示する', () => {
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useNotionErrorHandler(), {
      wrapper: Wrapper,
    });

    result.current(new Error('NetworkError'));

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('通信に失敗しました');
  });
});
