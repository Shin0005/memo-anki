'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { CardType, ReviewRating } from '@memo-anki/shared';

import CardTypeBadge from '@/features/card/components/CardTypeBadge';
import ReviewRatingButtons from './ReviewRatingButtons';

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
    <div className="flex-1 bg-gray-50">
      <div className="max-w-[860px] mx-auto px-6 py-8">
        {/* パンくずリスト */}
        <div className="mb-5">
          <p className="text-[12px] text-gray-400 mb-0.5">
            <Link href="/decks" className="hover:underline">
              デッキ一覧
            </Link>
            <span className="mx-1">›</span>
            <Link href={`/decks/${deckId}`} className="hover:underline">
              {deckName}
            </Link>
          </p>
          <h1 className="text-[20px] font-bold text-gray-900">復習中</h1>
        </div>

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

          {/* 中身（pageでNOTE/QUIZ切り替え） */}
          <div className="px-7 pb-6">{children}</div>

          {/* 評価ボタン */}
          <div className="border-t border-gray-200 px-7 py-5">
            <ReviewRatingButtons
              onRating={onRating}
              disabled={ratingDisabled}
            />
          </div>
        </section>

        {/* デッキ一覧へリンク */}
        <div className="mt-4">
          <Link
            href="/decks"
            className="text-[12.5px] text-gray-500 hover:text-gray-800 hover:underline"
          >
            ← 復習を中断してデッキ一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
