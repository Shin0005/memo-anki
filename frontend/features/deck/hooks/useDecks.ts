import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';

type Deck = components['schemas']['DeckResponse'];

export const useDecks = () => {
  return useQuery<Deck[]>({
    queryKey: ['decks'],
    queryFn: () => apiClient('/deck', 'GET') as Promise<Deck[]>,
  });
};
