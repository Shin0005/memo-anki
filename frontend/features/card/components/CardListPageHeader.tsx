'use client';

import Link from 'next/link';

type CardListPageHeaderProps = {
  deckName: string;
  onEditDeck: () => void;
  onCreateCard: () => void;
  onConnectNotion: () => void;
  onDisconnectNotion: () => void; // 連携解除
  onImport: () => void; // インポートモーダルを開く
  notionConnected?: boolean; // Notion連携済みかどうか
  notionConnecting?: boolean; // 連携開始リクエスト中の二重押下を防ぐ
  notionDisconnecting?: boolean; // 連携解除リクエスト中の二重押下を防ぐ
};

export default function CardListPageHeader({
  deckName,
  onEditDeck,
  onCreateCard,
  onConnectNotion,
  onDisconnectNotion,
  onImport,
  notionConnected = false,
  notionConnecting = false,
  notionDisconnecting = false,
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

      {/* 右：デッキ編集 + Notion連携 + カード追加 */}
      <div className="flex items-center gap-2">
        {/* 未連携：連携ボタン / 連携済み：解除ボタン＋インポートボタン */}
        {!notionConnected ? (
          <button
            onClick={onConnectNotion}
            disabled={notionConnecting}
            className="btn btn-outline btn-neutral btn-sm"
          >
            Notion連携
          </button>
        ) : (
          <>
            <button
              onClick={onImport}
              className="btn btn-outline btn-neutral btn-sm"
            >
              Notionインポート
            </button>
            <button
              onClick={onDisconnectNotion}
              disabled={notionDisconnecting}
              className="btn btn-outline btn-error btn-sm"
            >
              Notion連携解除
            </button>
          </>
        )}

        <button
          onClick={onEditDeck}
          className="btn btn-outline btn-primary btn-sm"
        >
          デッキ編集
        </button>

        <button onClick={onCreateCard} className="btn btn-primary btn-sm">
          ＋ カード追加
        </button>
      </div>
    </div>
  );
}
