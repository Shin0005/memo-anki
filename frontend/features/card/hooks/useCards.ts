import { apiClient } from '@/lib/api/client';
import { components } from '@memo-anki/shared';
import { useQuery } from '@tanstack/react-query';

type Card = components['schemas']['CardResponse'];

export const useCards = (deckId: string) => {
  return useQuery<Card[]>({
    queryKey: ['cards', deckId],
    queryFn: async () => {
      const all = (await apiClient('/card', 'GET')) as Card[];
      return all.filter((c) => c.deckId === deckId);
    },
  });
};
