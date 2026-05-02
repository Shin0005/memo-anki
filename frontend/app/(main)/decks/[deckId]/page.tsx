'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
import { useCards } from '@/features/card/hooks/useCards';
import { useCardMutations } from '@/features/card/hooks/useCardMutations';

import CardListPageHeader from '@/features/card/components/CardListPageHeader';
import CardList from '@/features/card/components/CardList';
import CardCreateModal from '@/features/card/components/CardCreateModal';
import CardEditModal from '@/features/card/components/CardEditModal';
import DeckUpdateModal from '@/features/deck/components/DeckUpdateModal';
import { useDeckMutations } from '@/features/deck/hooks/useDeckMutations';

type Card = components['schemas']['CardResponse'];
type CreateCardRequest = components['schemas']['CreateCardRequest'];
type UpdateCardRequest = components['schemas']['UpdateCardRequest'];
type Deck = components['schemas']['DeckResponse'];
type UpdateDeckRequest = components['schemas']['UpdateDeckRequest'];

export default function CardListPage() {
  // urlからパスパラメータ取得
  const params = useParams<{ deckId: string }>();
  const deckId = params.deckId;

  // キャッシュからdeckを取得（fetchはせずキャッシュ更新を購読）
  const queryClient = useQueryClient();
  const { data: decks } = useQuery<Deck[]>({
    queryKey: ['decks'],
    queryFn: () =>
      Promise.resolve(queryClient.getQueryData<Deck[]>(['decks']) ?? []),
    enabled: false,
  });
  const deck = decks?.find((deck) => deck.id === deckId);

  // tanstackquery
  // cardsがundefinedのまま到達することはないが初期値[]で型を確定
  const { data: cards = [], isLoading, isError, error } = useCards(deckId);
  const { createCard, updateCard, deleteCard } = useCardMutations();
  const { updateDeck } = useDeckMutations();

  // useState（モーダル開閉）
  const [openEditDeck, setOpenEditDeck] = useState(false);
  const [openCreateCard, setOpenCreateCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // CRUD
  //deck
  const handleEditDeck = (deckId: string, body: UpdateDeckRequest) => {
    updateDeck.mutate([deckId, body]);
  };
  //card
  const handleEditCard = (cardId: string) => {
    const target = cards.find((c) => c.id === cardId);
    if (target) setEditingCard(target);
  };
  const handleCreateCard = (data: CreateCardRequest) => {
    createCard.mutate(data);
  };
  const handleUpdateCard = (cardId: string, body: UpdateCardRequest) => {
    updateCard.mutate([cardId, body]);
  };
  const handleDeleteCard = (cardId: string) => {
    deleteCard.mutate(cardId);
  };

  if (isLoading) return <div>読み込み中...</div>;
  if (isError)
    return <div>エラーが発生しました: {(error as Error).message}</div>;
  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-[1536px] mx-auto px-6 py-8">
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <CardListPageHeader
            deckName={deck?.name ?? ''}
            onEditDeck={() => setOpenEditDeck(true)}
            onCreateCard={() => setOpenCreateCard(true)}
          />
          <CardList
            cards={cards}
            onEdit={handleEditCard}
            onDelete={handleDeleteCard}
          />
        </section>
      </div>

      {/* デッキ編集モーダル */}
      {deck && (
        <DeckUpdateModal
          open={openEditDeck}
          onClose={() => setOpenEditDeck(false)}
          initialDeck={deck}
          onSave={handleEditDeck}
        />
      )}

      {/* カード作成モーダル */}
      <CardCreateModal
        open={openCreateCard}
        deckId={deckId}
        onClose={() => setOpenCreateCard(false)}
        onCreate={handleCreateCard}
      />

      {/* カード編集モーダル */}
      {editingCard && (
        <CardEditModal
          open={!!editingCard}
          onClose={() => setEditingCard(null)}
          initialCard={editingCard}
          onSave={handleUpdateCard}
        />
      )}
    </main>
  );
}
