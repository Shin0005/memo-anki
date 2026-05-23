'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { CardType } from '@memo-anki/shared';

import ReviewLayout from '@/features/review/components/ReviewLayout';
import ReviewNoteBody from '@/features/review/components/ReviewNoteBody';
import ReviewQuizBody from '@/features/review/components/ReviewQuizBody';
import { useReviewCards } from '@/features/review/hooks/useReviewQueue';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { components } from '@memo-anki/shared';

/* 
  復習画面内のカード部分を入れ替えることによって復習の流れを表現
  つまりCSR。REST。
*/
type Deck = components['schemas']['DeckResponse'];

export default function ReviewPage() {
  /**
   * 状態管理・取得
   */
  // urlからパスパラメータ取得
  const router = useRouter();
  const params = useParams<{ deckId: string }>();
  const deckId = params.deckId;

  // キャッシュからdeckを取得（fetchはせずキャッシュ更新を購読）
  const queryClient = useQueryClient();
  const { data: decks } = useQuery<Deck[]>({
    queryKey: ['decks'],
    queryFn: () =>
      Promise.resolve(queryClient.getQueryData<Deck[]>(['decks']) ?? []),
    enabled: false,
  });
  const deck = decks?.find((deck) => deck.id === deckId); // 将来個別デッキの取得api追加する

  // Quiz内の回答表示状態を管理
  const [answerShown, setAnswerShown] = useState(false);

  // 現在の復習状態を取り出す
  const { current, finished, rating, isLoading, isError, error } =
    useReviewCards(deckId);

  // すべて完了 → レンダリング後に完了画面へ遷移
  // 採点ボタンを連打すると復習画面のレンダリング中に完了画面への
  // router.pushが呼ばれエラーになる
  useEffect(() => {
    if (finished) {
      router.push(`/decks/${deckId}/review/complete`);
    }
  }, [finished, router, deckId]);

  /**
   * 状態によるreturn分岐
   */

  // ロード中
  if (isLoading) return <div>読み込み中...</div>;

  // エラー発生
  if (isError)
    return <div>エラーが発生しました: {(error as Error).message}</div>;

  // すべて完了（useEffectで遷移するまでの間、何も表示しない）
  if (finished) return null;

  // 復習対象カードが0件
  if (!current) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="max-w-[860px] mx-auto px-6 py-16 text-center text-gray-400 text-[13px]">
          復習するカードはありません
        </div>
      </div>
    );
  }

  // 復習カードが存在

  // API レスポンスの type（0 | 1）を CardType enum にキャストする
  const cardType = current.type as CardType;
  const isQuiz = cardType === CardType.QUIZ;

  return (
    <ReviewLayout
      deckId={deckId}
      deckName={deck?.name ?? ''}
      cardName={current.name}
      cardType={cardType}
      onRating={(r) => {
        // カード切り替え前に回答表示状態をリセットする
        setAnswerShown(false);
        rating(r);
      }}
      // quizかつ回答が表示されているときtrue(ボタン有効化)
      ratingDisabled={isQuiz && !answerShown}
      preview={current.preview}
    >
      {/* children */}
      {isQuiz ? (
        <ReviewQuizBody
          question={current.question ?? ''}
          answer={current.answer ?? ''}
          shown={answerShown}
          onAnswerShown={setAnswerShown}
        />
      ) : (
        // ただcontentを表示するだけ
        <ReviewNoteBody content={current.content ?? ''} />
      )}
    </ReviewLayout>
  );
}
