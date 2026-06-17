import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import { NOTION_STATUS_QUERY_KEY } from './useNotionStatus';

/**
 * バックエンドが再連携要求時に body.code へ載せる識別子。
 * ただの401（JWT切れ）と区別し、連携ボタンの状態遷移に使う。
 */
export const NOTION_REAUTH_REQUIRED_CODE = 'NOTION_REAUTH_REQUIRED';

/**
 * Notion系API共通のエラーハンドラ
 *
 * バックエンド（NotionApiExceptionFilter）が返すメッセージをそのままトーストで出す。
 * 再連携要求(NOTION_REAUTH_REQUIRED)のときは連携状態を再取得し、
 * 連携解除→連携ボタンへの状態遷移を促す。
 */
export const useNotionErrorHandler = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (err: unknown) => {
      if (err instanceof HttpError) {
        // 再連携が必要：連携状態を再取得してボタン表示を更新する
        if (err.code === NOTION_REAUTH_REQUIRED_CODE) {
          queryClient.invalidateQueries({ queryKey: NOTION_STATUS_QUERY_KEY });
        }
        // バックエンドが組み立てたメッセージを表示する
        toast.error(err.message);
        return;
      }
      // HttpError以外（通信エラー等）は汎用メッセージ
      toast.error('通信に失敗しました');
    },
    [queryClient],
  );
};
