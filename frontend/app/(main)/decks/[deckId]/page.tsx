'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
// import { useQueryClient } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
// import { useCards } from '@/features/card/hooks/useCards';
// import { useCardMutations } from '@/features/card/hooks/useCardMutations';

import CardListPageHeader from '@/features/card/components/CardListPageHeader';
import CardList from '@/features/card/components/CardList';
import CardCreateModal from '@/features/card/components/CardCreateModal';
import CardEditModal from '@/features/card/components/CardEditModal';
import DeckUpdateModal from '@/features/deck/components/DeckUpdateModal';

type Card = components['schemas']['CardResponse'];
type Deck = components['schemas']['DeckResponse'];

const MOCK_DECK: Deck = {
  id: '714',
  name: 'test2',
  description: 'lalalaa',
  createdAt: '2026-04-28T14:23:39.477Z',
};

const MOCK_CARDS = [
  {
    id: '221',
    deckId: '714',
    name: 'OSI参照モデル',
    type: 0,
    content:
      'OSI参照モデルは7層構造。第1層:物理層、第2層:データリンク層、第3層:ネットワーク層、第4層:トランスポート層、第5層:セッション層、第6層:プレゼンテーション層、第7層:アプリケーション層。',
    question: null,
    answer: null,
    updatedAt: '2026-04-30T00:00:00.000Z',
  },
  {
    id: '222',
    deckId: '714',
    name: 'TCP/IPの特徴',
    type: 0,
    content:
      'TCPはコネクション型プロトコル。信頼性のあるデータ転送を保証する。UDPはコネクションレス型で高速だが信頼性は低い。',
    question: null,
    answer: null,
    updatedAt: '2026-04-30T00:00:00.000Z',
  },
  {
    id: '223',
    deckId: '714',
    name: 'IPアドレスクラス',
    type: 1,
    content: null,
    question: 'クラスAのIPアドレスの先頭ビットは何か？',
    answer: '0。範囲は 0.0.0.0 〜 127.255.255.255。',
    updatedAt: '2026-04-30T00:00:00.000Z',
  },
  {
    id: '224',
    deckId: '714',
    name: 'サブネットマスク',
    type: 1,
    content: null,
    question: '/24 のサブネットマスクを10進数で表せ',
    answer: '255.255.255.0',
    updatedAt: '2026-04-30T00:00:00.000Z',
  },
] as unknown as Card[];

export default function CardListPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = params.deckId;

  // const queryClient = useQueryClient();
  // const deck = queryClient.getQueryData<Deck[]>(['decks'])?.find((d) => d.id === deckId);
  // const { data: cards = [] } = useCards(deckId);
  // const { deleteCard } = useCardMutations(deckId);
  const deck = MOCK_DECK;
  const cards = MOCK_CARDS;

  const [openEditDeck, setOpenEditDeck] = useState(false);
  const [openCreateCard, setOpenCreateCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const handleEditCard = (cardId: string) => {
    const target = cards.find((c) => c.id === cardId);
    if (target) setEditingCard(target);
  };
  const handleDeleteCard = (cardId: string) => {
    // deleteCard(cardId);
    console.log('[stub] deleteCard', cardId);
  };

  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-[1536px] mx-auto px-6 py-8">
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <CardListPageHeader
            deckName={deck?.name ?? ''}
            onEditDeck={() => setOpenEditDeck(true)}
            onAddCard={() => setOpenCreateCard(true)}
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
          onSave={(values) => {
            console.log('[stub] updateDeck', deckId, values);
          }}
        />
      )}

      {/* カード作成モーダル */}
      <CardCreateModal
        open={openCreateCard}
        onClose={() => setOpenCreateCard(false)}
        onCreate={(values) => {
          console.log('[stub] createCard', values);
        }}
      />

      {/* カード編集モーダル */}
      {editingCard && (
        <CardEditModal
          open={!!editingCard}
          onClose={() => setEditingCard(null)}
          initialCard={editingCard}
          onSave={(values) => {
            console.log('[stub] updateCard', editingCard.id, values);
          }}
        />
      )}
    </main>
  );
}
