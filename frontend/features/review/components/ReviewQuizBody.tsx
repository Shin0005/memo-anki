// QUIZ タイプの「中身」。
//   - question を表示
//   - 「解答を表示」ボタンを押すと answer が表示される
//   - 表示後は「解答を非表示」ボタンで戻せる
//
// 「解答が表示済みかどうか」を親に伝えるため、onAnswerShownChange を渡せる。
// 親はこれを使って評価ボタンの活性/非活性を切り替える想定。

'use client';

import { useEffect, useState } from 'react';

type ReviewQuizBodyProps = {
  question: string;
  answer: string;
  /** カードが切り替わった時にリセットするためのキー */
  cardId: number | string;
  onAnswerShownChange?: (shown: boolean) => void;
};

export default function ReviewQuizBody({
  question,
  answer,
  cardId,
  onAnswerShownChange,
}: ReviewQuizBodyProps) {
  const [shown, setShown] = useState(false);

  // カード切り替え時に状態リセット
  useEffect(() => {
    setShown(false);
  }, [cardId]);

  // 親に状態を通知
  useEffect(() => {
    onAnswerShownChange?.(shown);
  }, [shown, onAnswerShownChange]);

  return (
    <>
      {/* 問題文 */}
      <div className="text-[16px] leading-[1.85] text-gray-800 whitespace-pre-wrap break-words">
        {question}
      </div>

      {/* 解答ブロック */}
      {shown ? (
        <>
          <hr className="my-6 border-0 border-t border-dashed border-gray-300" />
          <div className="text-[16px] leading-[1.85] text-gray-800 whitespace-pre-wrap break-words">
            {answer}
          </div>
          <div className="flex justify-center mt-5">
            <button
              type="button"
              onClick={() => setShown(false)}
              className="btn btn-outline btn-sm h-[42px] px-6 text-[14px] font-semibold"
            >
              解答を非表示
            </button>
          </div>
        </>
      ) : (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => setShown(true)}
            className="btn btn-outline h-[42px] px-6 text-[14px] font-semibold"
          >
            解答を表示
          </button>
        </div>
      )}
    </>
  );
}
