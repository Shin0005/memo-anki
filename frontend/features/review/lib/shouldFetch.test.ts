import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldFetch } from './shouldFetch';

// テストで使う時刻の基準（20001以上なら適当な値で良い）
const NOW = 100000;

// 任意件数のダミーキューを作るヘルパ
// shouldFetchはlengthしか見ないのでidだけあれば十分
type CardLike = Parameters<typeof shouldFetch>[0][number];
// 長さだけで中身のないダミーカード配列作成
const makeQueue = (n: number): CardLike[] =>
  Array.from(
    { length: n }, // 長さnで中身のない配列
    (_, i) => ({ id: String(i) }) as unknown as CardLike, // mapping
  );

describe('shouldFetch', () => {
  beforeEach(() => {
    // システム時刻を固定し、Date.now() を NOW に揃える
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 残り三件以下の時強制fetch
  it.each([0, 1, 2, 3])(
    '残り %i 件のとき経過時間が短くても true（強制 fetch）',
    (n) => {
      const queue = makeQueue(n);
      // lastFetchAt = NOW なので最小fetch間隔は満たしていない
      expect(shouldFetch(queue, NOW)).toBe(true);
    },
  );

  // 残り４件の境界値かつ閾値の一歩手前でfetchしない
  it('残り 4 件で経過 19999ms のときは fetch しない', () => {
    const queue = makeQueue(4);
    // 19999ms 前にfetchしたという想定
    const lastFetchAt = NOW - 19_999;
    expect(shouldFetch(queue, lastFetchAt)).toBe(false);
  });

  // 閾値20000msちょうどでfetch
  it('残り 4 件で経過 20000ms ちょうどのときは fetch する', () => {
    const queue = makeQueue(4);
    const lastFetchAt = NOW - 20_000;
    expect(shouldFetch(queue, lastFetchAt)).toBe(true);
  });

  // 残り10件で20s未満の時はfetchしない
  it('残り 10 件で経過 5 秒のときは fetch しない', () => {
    const queue = makeQueue(10);
    const lastFetchAt = NOW - 5_000;
    expect(shouldFetch(queue, lastFetchAt)).toBe(false);
  });

  // 初回などでlastFetchAt = 0 のときはfetch
  it('lastFetchAt = 0 のときはfetchする', () => {
    const queue = makeQueue(10);
    expect(shouldFetch(queue, 0)).toBe(true);
  });
});
