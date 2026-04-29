'use client';

import { components } from '@memo-anki/shared';
import CardTypeBadge from './CardTypeBadge';
import { buildCardDetail, formatDate } from '../utils/cardView';

type Card = components['schemas']['CardResponse'];

type CardRowProps = {
  card: Card;
  onEdit: (cardId: string) => void;
  onDelete: (cardId: string) => void;
};

export default function CardRow({ card, onEdit, onDelete }: CardRowProps) {
  const detail = buildCardDetail(card);
  const date = formatDate(card.updatedAt);

  return (
    <li
      className="
        grid items-center gap-4
        grid-cols-[1fr_auto] md:grid-cols-[1fr_2fr_auto_auto]
        px-4 py-3
        border-b border-gray-200 last:border-b-0
        bg-white hover:bg-gray-50
      "
    >
      {/* カード名 + タイプバッジ */}
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[13.5px] font-semibold text-gray-900 truncate">
          {card.name}
        </span>
        <CardTypeBadge type={card.type} />
      </div>

      {/* 詳細（md以上で表示） */}
      <div className="hidden md:block text-[12.5px] text-gray-500 leading-snug truncate">
        {detail}
      </div>

      {/* 日時（md以上で表示） */}
      <div className="hidden md:block text-[12px] text-gray-400 whitespace-nowrap">
        {date}
      </div>

      {/* ボタン */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onEdit(card.id)}
          className="btn btn-outline btn-sm"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(card.id)}
          className="btn btn-outline btn-error btn-sm font-bold"
        >
          削除
        </button>
      </div>
    </li>
  );
}
