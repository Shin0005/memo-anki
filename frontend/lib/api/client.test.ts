import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from './client';
import { HttpError } from './httpError';
import { useAuthStore } from '@/lib/store/useAuthStore';

// global.fetch を vi.fn() で置き換え
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  // Zustand のストア状態を毎回リセット (テスト間で AT が漏れないように)
  useAuthStore.getState().clearAuth();
});

// fetchが返すResponseの作成関数　json() の挙動だけテストで使う
const makeResponse = (
  status: number,
  body: unknown = {},
  ok?: boolean,
): Response =>
  ({
    status,
    ok: ok ?? (status >= 200 && status < 300),
    json: async () => body,
  }) as unknown as Response;

describe('apiClient', () => {
  // 正常系: 200 を返すレスポンスはそのまま json を返す
  it('200 OK のとき レスポンスの json をそのまま返す', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { id: 1, name: 'deck' }));

    const result = await apiClient('/deck/1', 'GET');

    expect(result).toEqual({ id: 1, name: 'deck' });
    // リトライしていない)ことを確認
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // 401 → refresh 成功 → 元リクエストをリトライする経路
  // この分岐を壊すとログインしてるのに突然エラー画面に飛ぶバグになる
  it('401 のとき refresh 成功 → 元リクエストを再試行して json を返す', async () => {
    mockFetch
      // 1回目: 元リクエストが 401
      .mockResolvedValueOnce(makeResponse(401, { message: 'token expired' }))
      // 2回目: /refresh が成功してATを返す
      .mockResolvedValueOnce(makeResponse(200, { accessToken: 'NEW_TOKEN' }))
      // 3回目: 元リクエストの再試行が成功
      .mockResolvedValueOnce(makeResponse(200, { id: 1 }));

    const result = await apiClient('/deck/1', 'GET');

    expect(result).toEqual({ id: 1 });
    // 合計3回呼ばれることを確認
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // refresh成功でATがZustandに保存されていることを確認
    expect(useAuthStore.getState().accessToken).toBe('NEW_TOKEN');
  });

  // AT, RTも切れている => ログアウト。
  it('401 のあとの refresh も失敗したら HttpError を throw する', async () => {
    mockFetch
      // 1回目: 元リクエストが 401（AT無効）
      .mockResolvedValueOnce(makeResponse(401, { message: 'token expired' }))
      // 2回目: /refresh も 401 (RT無効)
      .mockResolvedValueOnce(
        makeResponse(401, { message: 'refresh token invalid' }),
      );

    // HttpErrorが投げられることを確認
    await expect(apiClient('/deck/1', 'GET')).rejects.toBeInstanceOf(HttpError);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // DELETEの確認
  it('204 NO_CONTENT のときは null を返す', async () => {
    // 204 の Response.json() はパース失敗するので、ok=true を明示する
    mockFetch.mockResolvedValueOnce(makeResponse(204, null, true));

    const result = await apiClient('/deck/1', 'DELETE');

    expect(result).toBeNull();
  });
});
