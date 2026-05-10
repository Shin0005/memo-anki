import { describe, it, expect } from 'vitest';
import { mergeQueue } from './mergeQueue';

// ヘルパ
type CardLike = Parameters<typeof mergeQueue>[0][number];
const makeCard = (id: string): CardLike => ({ id }) as unknown as CardLike;

describe('mergeQueue', () => {
  // 分岐1: currentQueue.length === 0
  it('currentQueue が空のときは nextQueue をそのまま返す', () => {
    const next = [makeCard('a'), makeCard('b')];
    const result = mergeQueue([], next);
    expect(result).toEqual(next);
  });

  // 分岐2: 先頭1件を守りつつ、nextQueue から重複を除外する
  it('nextQueue に表示中カードと同じ id があるとき、それは除外され先頭が保護される', () => {
    // currentのAかという確認は必要ない。useReviewQueueにおいてmergeQueue()前にsetされている）
    const current = [makeCard('a'), makeCard('b'), makeCard('c')];
    const next = [makeCard('a'), makeCard('x'), makeCard('y')];
    const result = mergeQueue(current, next);
    //
    expect(result.map((c) => c.id)).toEqual(['a', 'x', 'y']);
  });

  // 分岐3: 重複が無いケース → そのまま [head, ...next] になる
  it('nextQueue に重複が無いとき、[先頭, ...nextQueue] が返る', () => {
    // 通常おこりえないはずの分岐
    const current = [makeCard('a'), makeCard('b')];
    const next = [makeCard('x'), makeCard('y')];
    const result = mergeQueue(current, next);
    expect(result.map((c) => c.id)).toEqual(['a', 'x', 'y']);
  });

  // 分岐3: nextQueue が空でも先頭は守られる
  it('nextQueue が空でも先頭1件は残る', () => {
    // jsの仕様確認と同義だが分岐として価値はある。
    const current = [makeCard('a'), makeCard('b')];
    const result = mergeQueue(current, []);
    expect(result.map((c) => c.id)).toEqual(['a']);
  });
});
