// 副作用と分岐の結合試験
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { ReviewRating } from '@memo-anki/shared';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import { useReviewCards } from './useReviewQueue';

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// テストで使う基準時刻（差分で使うので21s以上であれば良い）
const NOW = 100000;

// CardReviewResponse は OpenAPI 由来の型だが、テストでは id と version しか触らないので最小化
type Card = {
  id: string;
  deckId: string;
  name: string;
  type: number;
  content?: string;
  question?: string;
  answer?: string;
  queue: number;
  nextReviewAt: string;
  version: number;
};

const mkCard = (id: string, version = 1): Card => ({
  id,
  deckId: 'd1',
  name: id,
  type: 0,
  content: id,
  queue: 0,
  nextReviewAt: '2026-01-01T00:00:00Z',
  version,
});

// 各テストで新しい QueryClient を使う (キャッシュ汚染を避ける)
const createWrapper = () => {
  const queryClient = new QueryClient({
    // 異常系テストを高速にするためretryを拒否
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper };
};

// apiClient の呼び出しから GET / POST だけ抽出するヘルパ
const filterCalls = (method: 'GET' | 'POST') =>
  vi.mocked(apiClient).mock.calls.filter((c) => c[1] === method);

let nowSpy: MockInstance<() => number>;

// mock
beforeEach(() => {
  vi.mocked(apiClient).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
  // Date.now() を固定。TanStack Query の dataUpdatedAt も NOW になる
  nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  nowSpy.mockRestore();
});

describe('useReviewCards', () => {
  // ============================================================
  // ケース1: 初回ロード
  // ============================================================
  it('初回ロード後、キューの先頭が current になり finished=false', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce([
      mkCard('c1'),
      mkCard('c2'),
      mkCard('c3'),
    ]);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewCards('d1'), {
      wrapper: Wrapper,
    });

    // 初期状態: ロード中
    expect(result.current.isLoading).toBe(true);
    expect(result.current.current).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.current?.id).toBe('c1');
    expect(result.current.finished).toBe(false);
    expect(result.current.isError).toBe(false);

    // 初回 GET が getReviewQueue の契約通り `/card/review?deckId=<id>` で呼ばれていること
    // フック経由でも API パスが崩れていないことを担保する
    const getCalls = filterCalls('GET');
    expect(getCalls).toHaveLength(1);
    expect(getCalls[0][0]).toBe('/card/review?deckId=d1');
  });

  // ============================================================
  // ケース2: rating() で採点 / 残量豊富 + 経過短い → 再fetch しない
  // ============================================================
  it('採点後、shouldFetch=false なら再fetch せず次のカードに進む', async () => {
    vi.mocked(apiClient)
      // 初回 GET: 5件
      .mockResolvedValueOnce([
        mkCard('c1'),
        mkCard('c2'),
        mkCard('c3'),
        mkCard('c4'),
        mkCard('c5'),
      ])
      // POST 成功
      .mockResolvedValueOnce({ id: 'c1' });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewCards('d1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.current?.id).toBe('c1'));

    await act(async () => {
      await result.current.rating(ReviewRating.GOOD);
    });

    // 次のカードに進んでいる
    expect(result.current.current?.id).toBe('c2');
    // POST は1回呼ばれた
    expect(filterCalls('POST')).toHaveLength(1);
    // GET は初回の1回だけ (再fetch は発火していない)
    expect(filterCalls('GET')).toHaveLength(1);
  });

  // ============================================================
  // ケース3: 残量 ≤ 3 のとき強制 re-fetch & mergeQueue 適用
  // ============================================================
  it('残量3件のとき強制 fetch が走り、mergeQueue で先頭が保護される', async () => {
    vi.mocked(apiClient)
      // 初回 GET: 4件 (採点後の残量は3件 → 強制fetch)
      .mockResolvedValueOnce([
        mkCard('c1'),
        mkCard('c2'),
        mkCard('c3'),
        mkCard('c4'),
      ])
      // POST 成功
      .mockResolvedValueOnce({ id: 'c1' })
      // 再 fetch GET: c2 が含まれていても重複除外される
      .mockResolvedValueOnce([
        mkCard('c2'),
        mkCard('c5'),
        mkCard('c6'),
        mkCard('c7'),
        mkCard('c8'),
      ]);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewCards('d1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.current?.id).toBe('c1'));

    await act(async () => {
      await result.current.rating(ReviewRating.GOOD);
    });

    // 表示中(=先頭)は c2 のまま、後続は新キューで置換され重複除去
    expect(result.current.current?.id).toBe('c2');
    // 再 fetch が発火していること (GET 2回)
    expect(filterCalls('GET')).toHaveLength(2);
  });

  // ============================================================
  // ケース4: 採点ロック (連打されても POST は1回だけ)
  // ※ 旧ケース4 (20s経過で再fetch) は shouldFetch.test.ts でカバー済みのため削除
  // ============================================================
  it('rating() の連打中は2回目の呼び出しが採点ロックで弾かれる', async () => {
    // POST を保留状態にしておく（resolve するまで先に進ませない）
    let resolvePost: (value: unknown) => void = () => {};
    const pendingPost = new Promise<unknown>((res) => {
      resolvePost = res;
    });

    vi.mocked(apiClient).mockImplementation((_url: string, method: string) => {
      if (method === 'GET') {
        return Promise.resolve([
          mkCard('c1'),
          mkCard('c2'),
          mkCard('c3'),
          mkCard('c4'),
          mkCard('c5'),
        ]);
      }
      if (method === 'POST') {
        return pendingPost;
      }
      return Promise.reject(new Error('unexpected'));
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewCards('d1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.current?.id).toBe('c1'));

    // 1回目の rating() は POST 待ちで suspend する
    // 2回目の rating() は isRating.current=true で早期 return する想定
    let p1: Promise<void> | undefined;
    let p2: Promise<void> | undefined;
    await act(async () => {
      p1 = result.current.rating(ReviewRating.GOOD);
      p2 = result.current.rating(ReviewRating.GOOD);
      // 1回目の同期パートが流れるよう microtask を1度はかせる
      await Promise.resolve();
    });

    // この時点で POST は1回しか発火していない
    expect(filterCalls('POST')).toHaveLength(1);

    // POST を resolve して両 Promise を回収
    await act(async () => {
      resolvePost({ id: 'c1' });
      if (p1) await p1;
      if (p2) await p2;
    });

    // resolve 後も POST 数は1回のまま
    // (2回目の rating が「ロックで遅延されたあとに発火する」ような実装ミスの検出)
    expect(filterCalls('POST')).toHaveLength(1);
  });

  // ============================================================
  // ケース5: 採点 API がエラー → toast表示、ロック解除
  // ※ id細部 (c3) や再fetch回数の確認は内部実装依存のため省略。
  //   主目的は「toast が出る」「ロックが解除されて2回目も POST できる」の2点。
  // ============================================================
  it('採点APIがエラーの場合 toast を出してロックは解除される', async () => {
    vi.mocked(apiClient)
      // 初回 GET: 8件 (2回採点しても残量5件で shouldFetch=false を維持できる)
      .mockResolvedValueOnce([
        mkCard('c1'),
        mkCard('c2'),
        mkCard('c3'),
        mkCard('c4'),
        mkCard('c5'),
        mkCard('c6'),
        mkCard('c7'),
        mkCard('c8'),
      ])
      // POST が 500 で失敗
      .mockRejectedValueOnce(new HttpError(500, 'server error'))
      // 次の rating() の POST 用 (ロック解除を確認)
      .mockResolvedValueOnce({ id: 'c2' });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewCards('d1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.current?.id).toBe('c1'));

    await act(async () => {
      await result.current.rating(ReviewRating.GOOD);
    });

    // useReviewMutation の onError で toast.error が呼ばれる
    expect(toast.error).toHaveBeenCalledWith('サーバーエラーが発生しました');
    // 失敗しても UI は次のカードに進んでいる (楽観的更新)
    expect(result.current.current?.id).toBe('c2');

    // ロックが解除されていれば、続けて rating() できる (POST がもう1回発火する)
    await act(async () => {
      await result.current.rating(ReviewRating.GOOD);
    });
    expect(filterCalls('POST')).toHaveLength(2);
  });

  // ============================================================
  // ケース6: 再 fetch がエラー → サイレント継続
  // ============================================================
  it('再 fetch が失敗しても toast は出ず、残存キューで継続できる', async () => {
    vi.mocked(apiClient)
      // 初回 GET: 3件 (採点後 2件 ≤ 3 で強制 fetch)
      .mockResolvedValueOnce([mkCard('c1'), mkCard('c2'), mkCard('c3')])
      // POST 成功
      .mockResolvedValueOnce({ id: 'c1' })
      // 再 fetch がネットワークエラー
      .mockRejectedValueOnce(new Error('NetworkError'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewCards('d1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.current?.id).toBe('c1'));

    await act(async () => {
      await result.current.rating(ReviewRating.GOOD);
    });

    // toast は出ない (fetch エラーはサイレント仕様)
    expect(toast.error).not.toHaveBeenCalled();
    // 採点前に setLocalQueue で前進済みのため、c2 が表示されている
    expect(result.current.current?.id).toBe('c2');
    // 再 fetch は試みた (GET は2回呼ばれた) ことだけ確認
    expect(filterCalls('GET')).toHaveLength(2);
  });

  // ============================================================
  // ケース7: 全カードを採点しきると finished=true、その後のrating()はPOSTしない
  // ============================================================
  it('全カードを採点しきると finished=true になり、rating() は no-op', async () => {
    vi.mocked(apiClient)
      // 初回 GET: 1件だけ
      .mockResolvedValueOnce([mkCard('c1')])
      // POST 成功
      .mockResolvedValueOnce({ id: 'c1' })
      // 再 fetch (length=0 ≤ 3 で強制) も空
      .mockResolvedValueOnce([]);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReviewCards('d1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.current?.id).toBe('c1'));

    await act(async () => {
      await result.current.rating(ReviewRating.GOOD);
    });

    expect(result.current.current).toBeNull();
    expect(result.current.finished).toBe(true);
    // POST はここまでで1回だけ
    expect(filterCalls('POST')).toHaveLength(1);

    // queue=0 状態で rating() を再度呼んでもPOST は増えない
    await act(async () => {
      await result.current.rating(ReviewRating.GOOD);
    });
    expect(filterCalls('POST')).toHaveLength(1);
  });
});
