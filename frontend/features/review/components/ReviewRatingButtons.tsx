'use client';

import { ReviewRating } from '@memo-anki/shared';
import type { components } from '@memo-anki/shared';
type ReviewPreviewResponse =
  components['schemas']['CardReviewResponse']['preview'];

// disabledはquizの回答表示前に設定する
type ReviewRatingButtonsProps = {
  onRating: (rating: ReviewRating) => void;
  disabled?: boolean;
  preview: ReviewPreviewResponse;
};

/** ミリ秒を "1分" "10分" "1時間" "1日" などの日本語に整形する */
function formatMs(ms: number): string {
  if (ms < 60 * 60 * 1000) return `${Math.round(ms / 60000)}分`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.round(ms / 3600000)}時間`;
  return `${Math.round((ms / 86400000) * 10) / 10}日`; // sm2は整数にはならない
}

export default function ReviewRatingButtons({
  onRating,
  disabled = false,
  preview,
}: ReviewRatingButtonsProps) {
  return (
    <div className="flex items-stretch gap-2.5">
      <button
        type="button"
        onClick={() => onRating(ReviewRating.AGAIN)}
        disabled={disabled}
        className="btn btn-error flex-1 h-16 text-white text-[14px] font-bold"
      >
        Again <br />
        {preview && `> ${formatMs(preview.again)}`}
      </button>
      <button
        type="button"
        onClick={() => onRating(ReviewRating.HARD)}
        disabled={disabled}
        className="btn btn-warning flex-1 h-16 text-white text-[14px] font-bold"
      >
        Hard <br />
        {preview && `> ${formatMs(preview.hard)}`}
      </button>
      <button
        type="button"
        onClick={() => onRating(ReviewRating.GOOD)}
        disabled={disabled}
        className="btn btn-success flex-1 h-16 text-white text-[14px] font-bold"
      >
        Good <br />
        {preview && `> ${formatMs(preview.good)}`}
      </button>
      <button
        type="button"
        onClick={() => onRating(ReviewRating.EASY)}
        disabled={disabled}
        className="btn btn-info flex-1 h-16 text-white text-[14px] font-bold"
      >
        Easy <br />
        {preview && `> ${formatMs(preview.easy)}`}
      </button>
    </div>
  );
}
