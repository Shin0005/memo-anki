import { type components } from '@memo-anki/shared';

type Card = components['schemas']['CardReviewResponse'];
/**
 * 配列の先頭を除き、配列を置き換え
 * @param currentQueue
 * @param nextQueue
 * @returns
 */
export function mergeQueue(currentQueue: Card[], nextQueue: Card[]): Card[] {
  if (currentQueue.length === 0) return nextQueue;
  const head = currentQueue[0];
  // nextQueueから先頭を排除
  const rest = nextQueue.filter((c) => c.id !== head.id);
  return [head, ...rest];
}
