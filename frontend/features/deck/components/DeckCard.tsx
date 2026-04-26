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
      <p className="mt-2 text-[12.5px] text-gray-500 leading-snug">
        {deck.description || '説明はありません'}
      </p>

      {/* ボタン群　将来的に分離するかも */}
      {/* 復習ボタン */}
      <button
        onClick={() => onReview(deck.id)}
        className="mt-4 w-full h-9 rounded-md bg-indigo-600 hover:bg-indigo-800 text-white text-sm font-semibold"
      >
        復習
      </button>

      {/* 編集 / 削除 */}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => onEdit(deck.id)}
          className="flex-1 h-[30px] rounded-md border border-gray-300 bg-white text-gray-900 text-[12.5px] font-semibold hover:bg-gray-100"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(deck.id)}
          className="flex-1 h-[30px] rounded-md border border-red-500 bg-white text-red-500 text-[12.5px] font-bold hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </article>
  );
}
