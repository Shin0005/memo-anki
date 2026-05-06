// 復習画面のパンくず + タイトル部分。
// デッキ一覧 › デッキ名 › 復習

'use client';

import Link from 'next/link';

type ReviewBreadcrumbProps = {
  deckId: number;
  deckName: string;
};

export default function ReviewBreadcrumb({
  deckId,
  deckName,
}: ReviewBreadcrumbProps) {
  return (
    <div className="mb-5">
      <p className="text-[12px] text-gray-400 mb-0.5">
        <Link href="/decks" className="hover:underline">
          デッキ一覧
        </Link>
        <span className="mx-1">›</span>
        <Link href={`/decks/${deckId}`} className="hover:underline">
          {deckName}
        </Link>
        <span className="mx-1">›</span>
        <span className="text-gray-600 font-medium">復習</span>
      </p>
      <h1 className="text-[20px] font-bold text-gray-900">復習中</h1>
    </div>
  );
}
