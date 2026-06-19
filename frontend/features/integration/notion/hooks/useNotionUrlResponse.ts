'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Notion リダイレクト結果フック（URLパラメータ形式）
 *
 * Notion OAuth コールバック後、バックエンドは
 * `/decks/{deckId}?integration=<code>` へリダイレクトする。
 * このフックはその `integration` パラメータを読み取り、トーストで結果を伝える。
 */
export const useNotionUrlResponse = (deckId: string) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const result = searchParams.get('integration');
    if (!result) return;

    switch (result) {
      case 'notion_success':
        toast.success('Notionと連携しました');
        break;
      case 'notion_cancelled':
        toast.error('Notion連携をキャンセルしました');
        break;
      case 'notion_invalid':
        // クライアント起因の失敗。フロントは「失敗しました」だけ伝える。
        toast.error('Notion連携に失敗しました');
        break;
      case 'notion_failed':
        // Notion/内部起因の失敗。予期しないエラーとして伝える。
        toast.error('予期しないエラーが発生しました');
        break;
    }

    // パラメータを除去（リロード時のトースト再表示防止）
    router.replace(`/decks/${deckId}`);
  }, [searchParams, router, deckId]);
};
