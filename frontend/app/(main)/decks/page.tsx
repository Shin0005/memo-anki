'use client';

import DeckGrid from '../../../features/deck/components/DeckGrid';
import { components } from '@memo-anki/shared';
type Deck = components['schemas']['DeckResponse'];

// 仮のデッキデータ（後でAPI fetchに置き換える）
const dummyDecks: Deck[] = [
  {
    id: '1',
    name: '基本情報技術者試験',
    description: '午前問題の確認用デッキ',
    createdAt: '2025-05-01',
  },
  {
    id: '2',
    name: 'TypeScript / Next.js',
    description: 'フロントエンド技術の復習',
    createdAt: '2025-05-01',
  },
  { id: '3', name: '英単語', description: '', createdAt: '2025-05-01' },
  { id: '4', name: '英単語1', description: '', createdAt: '2025-05-01' },
  { id: '5', name: '英単語2', description: '', createdAt: '2025-05-01' },
];

export default function DeckListPage() {
  // 各ボタンの動き。まずは console.log だけ。
  // 後でAPI 呼び出しに置き換え。
  const handleReview = (deckId: string) => {
    console.log('復習:', deckId);
  };
  const handleEdit = (deckId: string) => {
    console.log('編集:', deckId);
  };
  const handleDelete = (deckId: string) => {
    console.log('削除:', deckId);
  };
  const handleCreate = () => {
    console.log('新規作成');
  };

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

              {/* 将来的に分離？ */}
              <button
                onClick={() => handleCreate()} //onclickには関数だけ
                className="mt-4 w-25 h-9 rounded-md bg-indigo-600 hover:bg-indigo-800 text-white text-sm font-semibold"
              >
                ＋ 新規作成
              </button>
            </div>

            <div className="border-t-[1px] border-gray-200 mb-8"></div>

            <DeckGrid
              decks={dummyDecks}
              onReview={handleReview}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
