'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { CardType } from '@memo-anki/shared';

import ReviewLayout from '@/features/review/components/ReviewLayout';
import ReviewNoteBody from '@/features/review/components/ReviewNoteBody';
import ReviewQuizBody from '@/features/review/components/ReviewQuizBody';
import { useReviewQueue } from '@/features/review/hooks/useReviewQueue';
import { buildCardDetail } from '@/features/card/utils/cardView';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { components } from '@memo-anki/shared';

// type Deck = components['schemas']['DeckResponse'];

export default function ReviewPage() {
  const router = useRouter();

  // urlからパスパラメータ取得
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);

  // // キャッシュからdeckを取得（fetchはせずキャッシュ更新を購読）
  // const queryClient = useQueryClient();
  // const { data: decks } = useQuery<Deck[]>({
  //   queryKey: ['decks'],
  //   queryFn: () =>
  //     Promise.resolve(queryClient.getQueryData<Deck[]>(['decks']) ?? []),
  //   enabled: false,
  // });
  // const deck = decks?.find((deck) => deck.id === deckId);

  const { current, finished, rating } = useReviewQueue(deckId);

  // デッキ名
  const [deckName] = useState('デッキ名');

  // QUIZ 中で「解答を表示済みか」を子から受け取り、
  // 評価ボタンの活性/非活性を切り替えるのに使う。
  const [answerShown, setAnswerShown] = useState(false);

  // すべて完了 → 完了画面へ
  if (finished) {
    router.push(`/decks/${deckId}/review/complete`);
    return null;
  }

  // ロード中 / カード未取得
  if (!current) {
    return (
      <main className="flex-1 bg-gray-50">
        <div className="max-w-[860px] mx-auto px-6 py-16 text-center text-gray-400 text-[13px]">
          復習カードを読み込み中…
        </div>
      </main>
    );
  }

  const cardName = buildCardDetail(current);
  // API レスポンスの type（0 | 1）を CardType enum にキャストする
  const cardType = current.type as CardType;
  const isQuiz = cardType === CardType.QUIZ;

  return (
    <ReviewLayout
      deckId={deckId}
      deckName={deckName}
      cardName={cardName}
      cardType={cardType}
      onRating={rating}
      ratingDisabled={isQuiz && !answerShown}
    >
      {/* children */}
      {isQuiz ? (
        // key={current.id} でカード切り替え時にコンポーネントを再マウントし、shown をリセットする
        <ReviewQuizBody
          key={current.id}
          question={current.question ?? ''}
          answer={current.answer ?? ''}
          onAnswerShownChange={setAnswerShown}
        />
      ) : (
        // ただcontentを表示するだけ
        <ReviewNoteBody content={current.content ?? ''} />
      )}
    </ReviewLayout>
  );
}
