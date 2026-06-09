import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';

type NotionStatus = components['schemas']['NotionStatusResponse'];

/** Notion連携状態のクエリキー（連携/解除後の再取得に使う） */
export const NOTION_STATUS_QUERY_KEY = ['notion', 'status'] as const;

/**
 * Notion連携状態取得フック
 *
 * 連携ボタンの出し分けに使う。
 * - connected=false → 連携ボタンのみ表示
 * - connected=true  → 連携解除ボタン＋インポートボタンを表示
 */
export const useNotionStatus = () => {
  return useQuery<NotionStatus>({
    queryKey: NOTION_STATUS_QUERY_KEY,
    queryFn: () =>
      apiClient('/integrations/notion/status', 'GET') as Promise<NotionStatus>,
  });
};
