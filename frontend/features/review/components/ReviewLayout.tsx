// 復習画面の「外枠」を提供する共有レイアウト。
//   - パンくず + タイトル
//   - 大枠カード（左上：タイプバッジ + カード名）
//   - children に NOTE / QUIZ それぞれの「中身（表示・回答表示）」を差し込む
//   - フッターに評価ボタン4つ
//   - 下部に「復習を中断して戻る」リンク
//
// NOTE / QUIZ で違うのは children の中身だけなので、
// このレイアウトを共有して使い回す。

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { CardType, ReviewRating } from '@memo-anki/shared';

import CardTypeBadge from '@/features/card/components/CardTypeBadge';
import ReviewBreadcrumb from './ReviewBreadcrumb';
import ReviewGradeButtons from './ReviewGradeButtons';

type ReviewLayoutProps = {
  deckId: number;
  deckName: string;
  cardName: string;
  cardType: CardType;
  onRating: (rating: ReviewRating) => void;
  ratingDisabled?: boolean;
  /** カード本文 + 回答などのカード中身。NOTE/QUIZ で差し替える。 */
  children: ReactNode;
};

export default function ReviewLayout({
  deckId,
  deckName,
  cardName,
  cardType,
  onRating,
  ratingDisabled = false,
  children,
}: ReviewLayoutProps) {
  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-[860px] mx-auto px-6 py-8">
        <ReviewBreadcrumb deckId={deckId} deckName={deckName} />

        {/* 大枠：カード */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* カードヘッダー：左上にタイプバッジ + カード名 */}
          <div className="flex items-center px-7 pt-6 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <CardTypeBadge type={cardType} />
              <h2 className="text-[15px] font-bold text-gray-900 truncate">
                {cardName}
              </h2>
            </div>
          </div>

          {/* 中身（NOTE / QUIZ で差し替え） */}
          <div className="px-7 pb-6">{children}</div>

          {/* フッター：評価ボタン */}
          <div className="border-t border-gray-200 px-7 py-5">
            <ReviewGradeButtons onRating={onRating} disabled={ratingDisabled} />
          </div>
        </section>

        {/* 下部の補助操作 */}
        <div className="mt-4">
          <Link
            href={`/decks/${deckId}`}
            className="text-[12.5px] text-gray-500 hover:text-gray-800 hover:underline"
          >
            ← 復習を中断してカード一覧に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
