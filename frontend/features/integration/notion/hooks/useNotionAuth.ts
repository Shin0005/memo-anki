import { apiClient } from '@/lib/api/client';
import { useMutation } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
import { HttpStatus } from '@/lib/api/statusCodes';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
type NotionAuthStartResponse = components['schemas']['NotionAuthStartResponse'];

/**
 * Notion OAuth 開始フック
 *
 * Notion連携ボタンが押されたら、このロジックが起動する。
 * このロジックは/authに接続し、/authはNotionに渡すための情報を
 * 含めたリダイレクトURLを発行するので、そのURLを使ってNotion側の
 * 認証画面に移動する。
 */
export const useNotionAuth = (deckId: string) => {
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
      if (
        err instanceof HttpError &&
        err.statusCode === HttpStatus.UNAUTHORIZED
      ) {
        // セッション切れ
        toast.error('ログインし直してください');
        return;
      }
      // ネットワーク不達もしくはサーバエラー
      toast.error('Notion連携の開始に失敗しました');
    },
  });

  return { connect };
};
