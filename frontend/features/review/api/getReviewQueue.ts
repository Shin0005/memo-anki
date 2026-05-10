import { apiClient } from '@/lib/api/client';
import { type components } from '@memo-anki/shared';

type Card = components['schemas']['CardReviewResponse'];

/**
 * 復習キューを取得する関数
 */
export async function fetchReviewQueue(deckId: string): Promise<Card[]> {
  return (await apiClient(`/card/review?deckId=${deckId}`, 'GET')) as Card[];
}
