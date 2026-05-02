import { components } from '@memo-anki/shared';

type CardType = components['schemas']['CardResponse']['type'];

type CardTypeBadgeProps = {
  type: CardType;
};

/** type によってNote, Quizを分岐してバッチを表示 */
export default function CardTypeBadge({ type }: CardTypeBadgeProps) {
  if (type === 0) {
    return (
      <span className="inline-block w-fit px-1.5 py-px rounded-full border border-blue-200 bg-blue-50 text-blue-500 text-[11px] font-semibold">
        NOTE
      </span>
    );
  }
  return (
    <span className="inline-block w-fit px-1.5 py-px rounded-full border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-500 text-[11px] font-semibold">
      QUIZ
    </span>
  );
}
