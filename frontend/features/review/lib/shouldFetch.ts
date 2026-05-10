import { type components } from '@memo-anki/shared';

type Card = components['schemas']['CardReviewResponse'];

/** 最小fetch間隔 = 20秒 */
const MIN_FETCH_INTERVAL = 20000;
/** fetch強制値 */
const FORCE_FETCH_THRESHOLD = 3;

/**
 * fetchのタイミング制御によりパフォーマンス改善
 *
 * 採点ごとにfetchを行うと、サーバーの負荷が大きくなる。
 * そのため、以下の二つの仕様を設ける。
 * - 最小fetch間隔：高速で回答を行った際にfetchせず次のqueueを閲覧する。
 * - fetch強制値：残りQueueが３件になった時に強制的にfetchする。
 * @param remainingQueue 先頭を削除したQueue
 * @param lastFetchAt
 * @returns
 */
export function shouldFetch(
  remainingQueue: Card[],
  lastFetchAt: number,
): boolean {
  const remaining = remainingQueue.length;

  // セーフティネット: 残り3件以下なら無条件でfetch
  if (remaining <= FORCE_FETCH_THRESHOLD) return true;

  // 通常: 前回fetchから20秒以上経過していればfetch
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed >= MIN_FETCH_INTERVAL) return true;

  return false;
}
