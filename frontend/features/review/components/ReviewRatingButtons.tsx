'use client';

import { ReviewRating } from '@memo-anki/shared';

// disabledはquizの回答表示前に設定する
type ReviewRatingButtonsProps = {
  onRating: (rating: ReviewRating) => void;
  disabled?: boolean;
};

export default function ReviewRatingButtons({
  onRating,
  disabled = false,
}: ReviewRatingButtonsProps) {
  return (
    <div className="flex items-stretch gap-2.5">
      <button
        type="button"
        onClick={() => onRating(ReviewRating.AGAIN)}
        disabled={disabled}
        className="btn btn-error flex-1 h-16 text-white text-[14px] font-bold"
      >
        Again
      </button>
      <button
        type="button"
        onClick={() => onRating(ReviewRating.HARD)}
        disabled={disabled}
        className="btn btn-warning flex-1 h-16 text-white text-[14px] font-bold"
      >
        Hard
      </button>
      <button
        type="button"
        onClick={() => onRating(ReviewRating.GOOD)}
        disabled={disabled}
        className="btn btn-success flex-1 h-16 text-white text-[14px] font-bold"
      >
        Good
      </button>
      <button
        type="button"
        onClick={() => onRating(ReviewRating.EASY)}
        disabled={disabled}
        className="btn btn-info flex-1 h-16 text-white text-[14px] font-bold"
      >
        Easy
      </button>
    </div>
  );
}
