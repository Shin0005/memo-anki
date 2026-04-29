'use client';

import Link from 'next/link';

type CardListPageHeaderProps = {
  deckName: string;
  onEditDeck: () => void;
  onAddCard: () => void;
};

export default function CardListPageHeader({
  deckName,
  onEditDeck,
  onAddCard,
}: CardListPageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
      {/* 左：パンくず + タイトル */}
      <div>
        <p className="text-[12px] text-gray-400 mb-0.5">
          <Link href="/decks" className="hover:underline">
            デッキ一覧
          </Link>
          <span className="mx-1">›</span>
          <span className="text-gray-600 font-medium">{deckName}</span>
        </p>
        <h1 className="text-[20px] font-bold text-gray-900">カード一覧</h1>
      </div>

      {/* 右：デッキ編集 + カード追加 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onEditDeck}
          className="btn btn-outline btn-primary btn-sm"
        >
          デッキ編集
        </button>
        <button onClick={onAddCard} className="btn btn-primary btn-sm">
          ＋ カード追加
        </button>
      </div>
    </div>
  );
}
