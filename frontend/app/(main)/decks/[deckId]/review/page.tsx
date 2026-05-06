// /decks/[deckId]/review = 復習画面。
//
// 役割:
//   - useReviewQueue でカードキューを取得し、現在のカードを表示
//   - カードの type に応じて NOTE / QUIZ の中身を出し分け
//   - 評価ボタンを押すとキューを進める。完了時は完了画面へ遷移
//
// 外枠（パンくず・カード枠・評価ボタン）は ReviewLayout が共通で持つ。
// type ごとの違いは body コンポーネントだけ。

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { CardType } from '@memo-anki/shared';

import ReviewLayout from '@/features/review/components/ReviewLayout';
import ReviewNoteBody from '@/features/review/components/ReviewNoteBody';
import ReviewQuizBody from '@/features/review/components/ReviewQuizBody';
import { useReviewQueue } from '@/features/review/hooks/useReviewQueue';
import { buildCardDetail } from '@/features/card/utils/cardView';

export default function ReviewPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);
  const router = useRouter();

  const { current, finished, rating } = useReviewQueue(deckId);

  // デッキ名
  const [deckName] = useState('基本情報技術者試験');

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
      {isQuiz ? (
        <ReviewQuizBody
          cardId={current.id}
          question={current.question ?? ''}
          answer={current.answer ?? ''}
          onAnswerShownChange={setAnswerShown}
        />
      ) : (
        <ReviewNoteBody content={current.content ?? ''} />
      )}
    </ReviewLayout>
  );
}
