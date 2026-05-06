import { apiClient } from '@/lib/api/client';
import { useMutation } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';
import { HttpStatus } from '@/lib/api/statusCodes';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';

type ReviewCardRequest = components['schemas']['ReviewCardRequest'];
type Card = components['schemas']['CardReviewResponse'];

export const useReviewMutation = () => {
  const handleError = (err: unknown) => {
    if (err instanceof HttpError) {
      switch (err.statusCode) {
        case HttpStatus.BAD_REQUEST:
          toast.error('正しい形式で入力してください');
          break;
        case HttpStatus.CONFLICT:
          toast.error('採点で競合が発生しました。');
          break;
        case HttpStatus.NOT_FOUND:
          toast.error('復習すべきカードがありません');
          break;
        default:
          toast.error('サーバーエラーが発生しました');
      }
    } else {
      toast.error('ネットワークエラーが発生しました');
    }
  };

  /** 採点 */
  const reviewedCard = useMutation<Card, unknown, [string, ReviewCardRequest]>({
    mutationFn: ([cardId, body]) =>
      apiClient(`/card/${cardId}/review`, 'POST', body) as Promise<Card>,
    // テンポ重視のため成功時にtoastは出さない仕様
    onError: handleError,
  });
  return {
    reviewedCard,
  };
};
