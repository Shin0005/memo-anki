'use client';

// カード切り替え時の shown リセットは page 側の onRating ハンドラで行う。
type ReviewQuizBodyProps = {
  question: string;
  answer: string;
  shown: boolean;
  onAnswerShown: (shown: boolean) => void;
};

export default function ReviewQuizBody({
  question,
  answer,
  shown,
  onAnswerShown,
}: ReviewQuizBodyProps) {
  // 解答を表示し、親に通知する
  const handleShow = () => {
    onAnswerShown(true);
  };

  // 解答を非表示にし、親に通知する
  const handleHide = () => {
    onAnswerShown(false);
  };

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
              onClick={handleHide}
              className="btn text-black btn-outline btn-sm h-[42px] px-6 text-[14px] font-semibold"
            >
              解答を非表示
            </button>
          </div>
        </>
      ) : (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={handleShow}
            className="btn text-black btn-outline h-[42px] px-6 text-[14px] font-semibold"
          >
            解答を表示
          </button>
        </div>
      )}
    </>
  );
}
