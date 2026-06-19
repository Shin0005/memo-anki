// Notion連携ボタンの副作用の単体試験(connectのwindow.location遷移 / disconnectのstatus無効化 / トースト出し分け)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import { useNotionAuth } from './useNotionAuth';
import { NOTION_STATUS_QUERY_KEY } from './useNotionStatus';

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, invalidateSpy };
};

// window.location.href への代入(画面全体遷移)を観測するためモックに差し替える
const originalLocation = window.location;
beforeEach(() => {
  vi.mocked(apiClient).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' },
  });
});
afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

// connect 連携開始
describe('useNotionAuth - connect(連携開始)', () => {
  it('成功時に /auth を叩き、返却URLへ window.location で遷移する', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      url: 'https://api.notion.com/authorize?x=1',
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotionAuth('deck-1'), {
      wrapper: Wrapper,
    });

    result.current.connect.mutate();

    await waitFor(() => expect(result.current.connect.isSuccess).toBe(true));

    expect(apiClient).toHaveBeenCalledWith(
      '/integrations/notion/auth?deckId=deck-1',
      'GET',
    );
    // 画面全体遷移が起きること
    expect(window.location.href).toBe('https://api.notion.com/authorize?x=1');
  });

  it('401のとき再ログインを促し、遷移しない', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(
      new HttpError(401, 'unauthorized'),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotionAuth('deck-1'), {
      wrapper: Wrapper,
    });

    result.current.connect.mutate();

    await waitFor(() => expect(result.current.connect.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('ログインし直してください');
    expect(window.location.href).toBe('');
  });

  it('400のとき不正リクエストのトーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new HttpError(400, 'bad'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotionAuth('deck-1'), {
      wrapper: Wrapper,
    });

    result.current.connect.mutate();

    await waitFor(() => expect(result.current.connect.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('不正なリクエストです。');
  });

  it('その他/非HttpErrorのとき汎用エラートーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new Error('NetworkError'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotionAuth('deck-1'), {
      wrapper: Wrapper,
    });

    result.current.connect.mutate();

    await waitFor(() => expect(result.current.connect.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Notion連携の開始に失敗しました');
  });
});

// disconnect 連携解除
describe('useNotionAuth - disconnect(連携解除)', () => {
  it('成功時に DELETE し、連携状態を無効化して成功トーストを出す', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce(null);
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useNotionAuth('deck-1'), {
      wrapper: Wrapper,
    });

    result.current.disconnect.mutate();

    await waitFor(() => expect(result.current.disconnect.isSuccess).toBe(true));

    expect(apiClient).toHaveBeenCalledWith('/integrations/notion', 'DELETE');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: NOTION_STATUS_QUERY_KEY,
    });
    expect(toast.success).toHaveBeenCalledWith('Notion連携を解除しました');
  });

  it('401のとき再ログインを促し、status は無効化しない', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(
      new HttpError(401, 'unauthorized'),
    );
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useNotionAuth('deck-1'), {
      wrapper: Wrapper,
    });

    result.current.disconnect.mutate();

    await waitFor(() => expect(result.current.disconnect.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('ログインし直してください');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('その他のとき汎用エラートーストを出す', async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new HttpError(500, 'server'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotionAuth('deck-1'), {
      wrapper: Wrapper,
    });

    result.current.disconnect.mutate();

    await waitFor(() => expect(result.current.disconnect.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Notion連携の解除に失敗しました');
  });
});
