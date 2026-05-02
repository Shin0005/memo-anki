import { components } from '@memo-anki/shared';

type Deck = components['schemas']['DeckResponse'];

type DeckCardProps = {
  deck: Deck;
  onReview: (deckId: string) => void;
  onEdit: (deckId: string) => void;
  onDelete: (deckId: string) => void;
};

export default function DeckCard({
  deck,
  onReview,
  onEdit,
  onDelete,
}: DeckCardProps) {
  return (
    <article className="bg-white border border-gray-200 rounded-lg p-4">
      {/* タイトル */}
      <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
        {deck.name}
      </h2>

      {/* 説明文 */}
      <p className="mt-2 text-[12.5px] text-gray-500 leading-snug break-words">
        {deck.description || '説明はありません'}
      </p>

      {/* ボタン群　将来的に分離するかも */}
      {/* 復習ボタン */}
      <button
        onClick={() => onReview(deck.id)}
        className="btn btn-primary w-full mt-4"
      >
        復習
      </button>

      {/* 編集 / 削除 */}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => onEdit(deck.id)}
          className="btn btn-outline btn-sm flex-1"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(deck.id)}
          className="btn btn-outline btn-error btn-sm flex-1"
        >
          削除
        </button>
      </div>
    </article>
  );
}
