import { apiClient } from '@/lib/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
import { toast } from 'sonner';
import { useNotionErrorHandler } from './useNotionErrorHandler';

type NotionImportResponse = components['schemas']['NotionImportResponse'];

type ImportParams = {
  databaseId: string;
  deckId: string;
  columnName: string;
};

/**
 * Notion DBインポート実行フック
 *
 * 確認ステップで「インポート」が押されたときに mutateAsync で実行する。
 * 成功時はカード一覧を再取得し完了トーストを出す。
 * 失敗時はトーストを出すのみ（呼び出し側で確認ステップに戻す）。
 */
export const useNotionImport = () => {
  const queryClient = useQueryClient();
  const handleError = useNotionErrorHandler();

  return useMutation<NotionImportResponse, unknown, ImportParams>({
    mutationFn: ({ databaseId, deckId, columnName }) =>
      apiClient(
        `/integrations/notion/databases/${encodeURIComponent(databaseId)}/import`,
        'POST',
        { deckId, columnName },
      ) as Promise<NotionImportResponse>,

    onSuccess: () => {
      // 取り込んだカードを一覧へ反映
      queryClient.invalidateQueries({ queryKey: ['cards'], exact: false });
      toast.success('インポートが完了しました');
    },

    onError: handleError,
  });
};
