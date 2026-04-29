'use client';

import { components } from '@memo-anki/shared';
import CardRow from './CardRow';

type Card = components['schemas']['CardResponse'];

type CardListProps = {
  cards: Card[];
  onEdit: (cardId: string) => void;
  onDelete: (cardId: string) => void;
};

export default function CardList({ cards, onEdit, onDelete }: CardListProps) {
  return (
    <>
      {/* 列ラベル（md以上で詳細・日時列を表示） */}
      <div
        className="
          grid gap-4
          grid-cols-[1fr_auto] md:grid-cols-[1fr_2fr_auto_auto]
          px-4 py-2
          bg-gray-50
          border-b-2 border-gray-200
          text-[11.5px] font-semibold uppercase tracking-wider text-gray-500
        "
      >
        <span>カード名 / タイプ</span>
        <span className="hidden md:block">詳細</span>
        <span className="hidden md:block">作成日時</span>
        <span />
      </div>

      {/* 行 */}
      <ul>
        {cards.length === 0 ? (
          <li className="px-4 py-10 text-center text-[13px] text-gray-400">
            カードがまだありません
          </li>
        ) : (
          cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </ul>
    </>
  );
}
