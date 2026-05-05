// enum集合 純粋なtsなのでsharedに配置

/**
 * カードタイプ
 * NOTE = 0,
 * QUIZ = 1,
 */
export enum CardType {
  NOTE = 0,
  QUIZ = 1,
}
/**
 * キュータイプ
 * NEW = 0,
 * SHORT = 1,
 * LONG = 2,
 */
export enum CardQueue {
  NEW = 0,
  SHORT = 1,
  LONG = 2,
}
/**
 * レビュー評価点
 * AGAIN = 0,
 * HARD = 1,
 * GOOD = 2,
 * EASY = 3,
 */
export enum ReviewRating {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3,
}
