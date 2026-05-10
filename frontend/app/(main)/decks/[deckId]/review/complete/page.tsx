'use client';

import Link from 'next/link';

export default function ReviewCompletePage() {
  return (
    <div className="flex-1 bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-[1536px] mx-auto px-6 py-12">
        {/* 完了メッセージ用の白いパネル */}
        <section
          className="bg-white border border-gray-200 rounded-lg mx-auto px-8 py-14 text-center"
          style={{ maxWidth: 520 }}
        >
          {/* 成功アイコン（チェックマーク） */}
          <div
            className="mx-auto mb-5 flex items-center justify-center rounded-full"
            style={{
              width: 72,
              height: 72,
              background: '#f5f3ff',
              border: '1.5px solid #ddd6fe',
            }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4f2bdf"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 32, height: 32 }}
            >
              <polyline points="4 12.5 10 18.5 20 6.5" />
            </svg>
          </div>

          {/* メインメッセージ */}
          <h1 className="text-[22px] font-bold text-gray-900 mb-2">
            お疲れさまでした。
          </h1>
          <p className="text-[13px] text-gray-500 mb-8">
            このデッキの復習はすべて完了しました。
          </p>

          {/* デッキ一覧へ戻るボタン */}
          <Link href="/decks" className="btn btn-primary">
            デッキ一覧に戻る
          </Link>
        </section>
      </div>
    </div>
  );
}
