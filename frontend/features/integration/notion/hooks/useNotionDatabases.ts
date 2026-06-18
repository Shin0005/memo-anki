import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';

type NotionDatabaseListResponse =
  components['schemas']['NotionDatabaseListResponse'];

/** Notion DB一覧のクエリキー */
export const NOTION_DATABASES_QUERY_KEY = ['notion', 'databases'] as const;

/**
 * Notion DB一覧取得フック
 *
 * インポートモーダルの最初のステップ（DB選択）で使う。
 * enabled でモーダルが開いていて連携済みのときだけ取得する。
 */
export const useNotionDatabases = (enabled: boolean) => {
  return useQuery({
    queryKey: NOTION_DATABASES_QUERY_KEY,
    queryFn: () =>
      apiClient(
        '/integrations/notion/databases',
        'GET',
      ) as Promise<NotionDatabaseListResponse>,
    enabled,
  });
};
