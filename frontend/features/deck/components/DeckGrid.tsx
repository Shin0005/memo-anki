import { components } from '@memo-anki/shared';
import DeckCard from './DeckCard';
type Deck = components['schemas']['DeckResponse'];

type DeckGridProps = {
  decks: Deck[];
  onReview: (deckId: string) => void;
  onEdit: (deckId: string) => void;
  onDelete: (deckId: string) => void;
};

export default function DeckGrid({
  decks,
  onReview,
  onEdit,
  onDelete,
}: DeckGridProps) {
  if (decks.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[20px] text-gray-400 ">デッキがありません</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {decks.map((deck) => (
        <DeckCard
          key={deck.id}
          deck={deck}
          onReview={onReview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
