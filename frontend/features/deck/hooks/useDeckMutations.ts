import { apiClient } from '@/lib/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
import { HttpStatus } from '@/lib/api/statusCodes';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';

type CreateDeckRequest = components['schemas']['CreateDeckRequest'];
type UpdateDeckRequest = components['schemas']['UpdateDeckRequest'];
type Deck = components['schemas']['DeckResponse'];

export const useDeckMutations = () => {
  const queryClient = useQueryClient();

  const handleSuccess = (action: string) => () => {
    queryClient.invalidateQueries({ queryKey: ['decks'] });
    toast.success(`${action}に成功しました`);
  };

  const handleError = (err: unknown) => {
    if (err instanceof HttpError) {
      switch (err.statusCode) {
        case HttpStatus.BAD_REQUEST:
          toast.error('正しい形式で入力してください');
          break;
        case HttpStatus.CONFLICT:
          toast.error('同じ名前のデッキが既に存在します');
          break;
        case HttpStatus.NOT_FOUND:
          toast.error('デッキが見つかりません');
          break;
        default:
          toast.error('サーバーエラーが発生しました');
      }
    } else {
      toast.error('ネットワークエラーが発生しました');
    }
  };

  /** デッキ削除 Fetch */
  const deleteDeck = useMutation({
    mutationFn: (deckId: string) => apiClient(`/deck/${deckId}`, 'DELETE'),
    onSuccess: handleSuccess('削除'),
    onError: handleError,
  });
  /** デッキ作成 Fetch */
  const createDeck = useMutation({
    mutationFn: (data: CreateDeckRequest) => apiClient('/deck', 'POST', data),
    onSuccess: handleSuccess('作成'),
    onError: handleError,
  });
  /** デッキ更新 Fetch */
  const updateDeck = useMutation<Deck, unknown, [string, UpdateDeckRequest]>({
    mutationFn: ([deckId, body]) =>
      apiClient(`/deck/${deckId}`, 'PUT', body) as Promise<Deck>,
    onSuccess: (updated) => {
      // ['decks'] キャッシュを直接書き換え、購読中のページを再レンダーさせる
      queryClient.setQueryData<Deck[]>(['decks'], (old) =>
        old?.map((d) => (d.id === updated.id ? updated : d)),
      );
      toast.success('更新に成功しました');
    },
    onError: handleError,
  });

  return {
    deleteDeck,
    createDeck,
    updateDeck,
  };
};
