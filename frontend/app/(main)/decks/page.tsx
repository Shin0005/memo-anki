'use client';

import { useDeckMutations } from '@/features/deck/hooks/useDeckMutations';
import DeckGrid from '../../../features/deck/components/DeckGrid';
import { useDecks } from '@/features/deck/hooks/useDecks';

import { components } from '@memo-anki/shared';
import { useState } from 'react';
import DeckCreateModal from '@/features/deck/components/DeckCreateModal';
type CreateDeckRequest = components['schemas']['CreateDeckRequest'];

export default function DeckListPage() {
  // tanstackquery
  const { createDeck, deleteDeck } = useDeckMutations();
  const { data: decks, isLoading, isError, error } = useDecks();

  // useState
  const [open, setOpen] = useState(false);
  const openModal = () => {
    setOpen(true);
  };
  const closeModal = () => {
    setOpen(false);
  };
  // CRUD(可読性のためにラップしている)
  // 以下二つはのちにlinkをつける
  const handleReview = () => {
    console.log('復習:link');
  };
  const handleEdit = () => {
    console.log('編集:link');
  };
  const handleDelete = (deckId: string) => {
    deleteDeck.mutate(deckId);
  };
  const handleCreate = (data: CreateDeckRequest) => {
    createDeck.mutate(data);
  };

  // 例外処理をしないとdataがdeck[]として型認識されない
  if (isLoading) return <div>読み込み中...</div>;
  if (isError)
    return <div>エラーが発生しました: {(error as Error).message}</div>;

  return (
    <div className="flex-1 flex flex-col bg-white text-gray-800">
      {/* メイン領域（薄いグレーの背景） */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-[1536px] mx-auto px-6 py-8">
          {/* 白いパネルの中にタイトルとグリッドを置く */}
          <section className="bg-white border border-gray-200 rounded-lg px-8 py-7">
            {/* タイトル + ボタンを横並びに */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-[20px] font-bold">デッキ一覧</h1>
              <button
                onClick={() => {
                  openModal();
                }}
                className="mt-4 w-25 h-9 rounded-md bg-indigo-600 hover:bg-indigo-800 text-white text-sm font-semibold"
              >
                ＋ 新規作成
              </button>
            </div>

            <div className="border-t-[1px] border-gray-200 mb-8"></div>

            <DeckGrid
              decks={decks ?? []}
              onReview={handleReview}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </section>
        </div>
        <DeckCreateModal
          open={open}
          onClose={closeModal}
          onCreate={handleCreate}
        />
      </main>
    </div>
  );
}
