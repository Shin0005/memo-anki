import { apiClient } from '@/lib/api/client';
import { HttpError } from '@/lib/api/httpError';
import { HttpStatus } from '@/lib/api/statusCodes';
import { components } from '@memo-anki/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type CreateCardRequest = components['schemas']['CreateCardRequest'];
type UpdateCardRequest = components['schemas']['UpdateCardRequest'];

// 後で書き直し
export function useCardMutations() {
  const queryClient = useQueryClient();

  const handleSuccess = (action: string) => () => {
    queryClient.invalidateQueries({ queryKey: ['cards'], exact: false });
    toast.success(`${action}に成功しました`);
  };

  const handleError = (err: unknown) => {
    if (err instanceof HttpError) {
      console.error(`[Card API Error] ${err.statusCode}: ${err.message}`);
      switch (err.statusCode) {
        case HttpStatus.BAD_REQUEST:
          toast.error('正しい形式で入力してください');
          break;
        case HttpStatus.CONFLICT:
          toast.error('同じ名前のカードが既に存在します');
          break;
        case HttpStatus.NOT_FOUND:
          toast.error('カードが見つかりません');
          break;
        default:
          toast.error('サーバーエラーが発生しました');
      }
    } else {
      console.error('[Network Error]', err);
      toast.error('ネットワークエラーが発生しました');
    }
  };
  /** カード削除 Fetch */
  const deleteCard = useMutation({
    mutationFn: (cardId: string) => apiClient(`/card/${cardId}`, 'DELETE'),
    onSuccess: handleSuccess('削除'),
    onError: handleError,
  });
  /** カード作成 Fetch */
  const createCard = useMutation({
    mutationFn: (data: CreateCardRequest) => apiClient('/card', 'POST', data),
    onSuccess: handleSuccess('作成'),
    onError: handleError,
  });
  /** カード更新 Fetch */
  const updateCard = useMutation({
    mutationFn: ([cardId, body]: [string, UpdateCardRequest]) =>
      apiClient(`/card/${cardId}`, 'PUT', body),
    onSuccess: handleSuccess('更新'),
    onError: handleError,
  });

  return {
    deleteCard,
    createCard,
    updateCard,
  };
}
