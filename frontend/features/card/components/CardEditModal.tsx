'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { components } from '@memo-anki/shared';

type Card = components['schemas']['CardResponse'];
type UpdateCardRequest = components['schemas']['UpdateCardRequest'];

type FormValues = {
  name: string;
  content?: string;
  question?: string;
  answer?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialCard: Card;
  onSave: (cardId: string, body: UpdateCardRequest) => void;
};

export default function CardEditModal({
  open,
  onClose,
  initialCard,
  onSave,
}: Props) {
  // typeは変更不可。type変更が必要な場合はカードを作り直す運用
  const isQuiz = initialCard.type === 1;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  // 開くたびに初期値をフォームへ流し込む
  useEffect(() => {
    if (open) {
      reset({
        name: initialCard.name,
        content: String(initialCard.content ?? ''),
        question: String(initialCard.question ?? ''),
        answer: String(initialCard.answer ?? ''),
      });
    }
  }, [open, initialCard, reset]);

  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormValues) => {
    const request: UpdateCardRequest = {
      name: data.name,
      content: !isQuiz ? data.content || undefined : undefined,
      question: isQuiz ? data.question || undefined : undefined,
      answer: isQuiz ? data.answer || undefined : undefined,
    };
    onSave(initialCard.id, request);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h2 className="text-[16px] font-bold text-gray-900">
              カードを編集
            </h2>
            <span
              className={`inline-block w-fit px-1.5 py-px rounded-full border text-[11px] font-semibold ${
                isQuiz
                  ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-500'
                  : 'border-blue-200 bg-blue-50 text-blue-500'
              }`}
            >
              {isQuiz ? 'QUIZ' : 'NOTE'}
            </span>
          </div>

          <div className="mb-4 mt-4">
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              カード名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              {...register('name', {
                required: 'カード名は必須です',
                maxLength: {
                  value: 50,
                  message: '50文字以内で入力してください',
                },
              })}
              className="input input-bordered w-full"
            />
            {errors.name && (
              <p className="text-red-500 text-[12px] mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {!isQuiz && (
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                内容
              </label>
              <textarea
                {...register('content', {
                  maxLength: {
                    value: 10000,
                    message: '10000文字以内で入力してください',
                  },
                })}
                placeholder="内容を入力してください"
                className="textarea textarea-bordered w-full min-h-[88px]"
              />
              {errors.content && (
                <p className="text-red-500 text-[12px] mt-1">
                  {errors.content.message}
                </p>
              )}
            </div>
          )}

          {isQuiz && (
            <>
              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  問題
                </label>
                <textarea
                  {...register('question', {
                    maxLength: {
                      value: 5000,
                      message: '5000文字以内で入力してください',
                    },
                  })}
                  placeholder="例: WWWとは？"
                  className="textarea textarea-bordered w-full min-h-[88px]"
                />
                {errors.question && (
                  <p className="text-red-500 text-[12px] mt-1">
                    {errors.question.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  正答
                </label>
                <textarea
                  {...register('answer', {
                    maxLength: {
                      value: 5000,
                      message: '5000文字以内で入力してください',
                    },
                  })}
                  placeholder="例: World Wide Webの略称です"
                  className="textarea textarea-bordered w-full min-h-[88px]"
                />
                {errors.answer && (
                  <p className="text-red-500 text-[12px] mt-1">
                    {errors.answer.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClose}
            >
              戻る
            </button>
            <button type="submit" className="btn btn-primary btn-sm rounded-md">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
