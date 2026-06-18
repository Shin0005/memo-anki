import { apiClient } from '@/lib/api/client';
import { useMutation } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
import { useNotionErrorHandler } from './useNotionErrorHandler';

type NotionColumnListResponse =
  components['schemas']['NotionColumnListResponse'];

/**
 * Notion DBのカラム一覧取得フック
 *
 * DB選択ステップで「次へ」が押されたときに mutateAsync で取得する。
 * isPending を遷移中のローディング表示に使う。
 */
export const useNotionColumns = () => {
  const handleError = useNotionErrorHandler();

  // 命令的に取得するのでmutationにしている
  return useMutation<NotionColumnListResponse, unknown, string>({
    mutationFn: (databaseId: string) =>
      apiClient(
        `/integrations/notion/databases/${encodeURIComponent(databaseId)}/columns`,
        'GET',
      ) as Promise<NotionColumnListResponse>,

    onError: handleError,
  });
};
