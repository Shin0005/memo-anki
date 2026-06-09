import { apiClient } from '@/lib/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
import { HttpStatus } from '@/lib/api/statusCodes';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import { NOTION_STATUS_QUERY_KEY } from './useNotionStatus';
type NotionAuthStartResponse = components['schemas']['NotionAuthStartResponse'];

/**
 * Notion OAuth 開始 / 連携解除フック
 *
 * - connect: Notion連携ボタンが押されたら起動する。/authに接続し、
 *   発行されたリダイレクトURLを使ってNotion側の認証画面に移動する。
 * - disconnect: 連携解除ボタンが押されたら起動する。連携情報を削除し、
 *   状態を再取得してボタンを連携ボタンに戻す。
 */
export const useNotionAuth = (deckId: string) => {
  const queryClient = useQueryClient();

  const connect = useMutation<NotionAuthStartResponse>({
    mutationFn: () =>
      apiClient(
        `/integrations/notion/auth?deckId=${encodeURIComponent(deckId)}`,
        'GET',
      ) as Promise<NotionAuthStartResponse>,

    onSuccess: ({ url }) => {
      // ここで Notion の認可画面へブラウザ全体遷移する
      window.location.href = url;
    },

    onError: (err) => {
      if (err instanceof HttpError) {
        // JWTセッション切れ（apiClientがrefresh再試行してもなお401）
        if (err.statusCode === HttpStatus.UNAUTHORIZED) {
          toast.error('ログインし直してください');
          return;
        }
        // deckId不正等のクライアント起因（globalfilterがJSONで返す）
        if (err.statusCode === HttpStatus.BAD_REQUEST) {
          toast.error('不正なリクエストです。');
          return;
        }
      }
      // ネットワーク不達もしくはサーバエラー
      toast.error('Notion連携の開始に失敗しました');
    },
  });

  const disconnect = useMutation({
    mutationFn: () => apiClient('/integrations/notion', 'DELETE'),

    onSuccess: () => {
      // 未連携に変わったので状態を再取得しボタンを切り替える
      queryClient.invalidateQueries({ queryKey: NOTION_STATUS_QUERY_KEY });
      toast.success('Notion連携を解除しました');
    },

    onError: (err) => {
      if (
        err instanceof HttpError &&
        err.statusCode === HttpStatus.UNAUTHORIZED
      ) {
        // セッション切れ
        toast.error('ログインし直してください');
        return;
      }
      // ネットワーク不達もしくはサーバエラー
      toast.error('Notion連携の解除に失敗しました');
    },
  });

  return { connect, disconnect };
};
