// NOTE タイプの「中身」。
// content をそのまま表示するだけ（解答の概念がない）。

'use client';

type ReviewNoteBodyProps = {
  content: string;
};

export default function ReviewNoteBody({ content }: ReviewNoteBodyProps) {
  return (
    <div className="text-[16px] leading-[1.85] text-gray-800 whitespace-pre-wrap break-words">
      {content}
    </div>
  );
}
