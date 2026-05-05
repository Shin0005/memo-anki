import { Card } from '@prisma/client';
import { CardQueue } from '@memo-anki/shared';
import _ from 'lodash';

/**
 * 復習時間順に取得されたカードをqueueごとに分割してソート
 *
 * 「short -> long -> new」の順になり、一部shortとlong/newが入れ替わる仕様
 * @param cards Card[]
 * @returns ソートした配列
 */
export function sortReviewQueue(cards: Card[]) {
  // カード配列をQueueで分割
  // Prismaが生成するqueueはnumber型なので、enum型に明示変換してから比較する
  const newQueue = cards.filter((card: Card) => {
    const queue: CardQueue = card.queue;
    return queue === CardQueue.NEW;
  });
  const shortQueue = cards.filter((card: Card) => {
    const queue: CardQueue = card.queue;
    return queue === CardQueue.SHORT;
  });
  const longQueue = cards.filter((card: Card) => {
    const queue: CardQueue = card.queue;
    return queue === CardQueue.LONG;
  });

  // shortばかり前に来ないようにシャッフル

  // shortが二つ以下の場合は変える必要性がない
  if (shortQueue.length > 2) {
    // shortからランダムに二つのインデックスを取得
    const [rNewNum, rLongNum] = _.sampleSize(_.range(shortQueue.length), 2);
    // 最新newQueueのカードとランダムなshortQueueのカードを入れ替え
    if (newQueue.length > 0) {
      const rShortCard = shortQueue[rNewNum];
      shortQueue[rNewNum] = newQueue[0];
      newQueue[0] = rShortCard;
    }
    if (longQueue.length > 0) {
      const rShortCard = shortQueue[rLongNum];
      shortQueue[rLongNum] = longQueue[0];
      longQueue[0] = rShortCard;
    }
  }

  // short -> long -> new の順に結合して返却
  return [...shortQueue, ...longQueue, ...newQueue];
}
