'use client';

import { useForm } from 'react-hook-form';
import { components } from '@memo-anki/shared';
import { useEffect } from 'react';
type CreateCardRequest = components['schemas']['CreateCardRequest'];

type FormValues = {
  isQuiz: boolean;
  name: string;
  content?: string;
  question?: string;
  answer?: string;
};

type Props = {
  open: boolean;
  deckId: string;
  onClose: () => void;
  onCreate: (data: CreateCardRequest) => void;
};

export default function CardCreateModal({
  open,
  deckId,
  onClose,
  onCreate,
}: Props) {
  // useForm
  const {
    register,
    handleSubmit,
    reset,
    resetField,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      isQuiz: false,
      name: '',
      content: '',
      question: '',
      answer: '',
    },
  });
  // type変更時のreset処理
  const isQuiz = watch('isQuiz');
  useEffect(() => {
    resetField('content');
    resetField('question');
    resetField('answer');
  }, [isQuiz, resetField]);

  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormValues) => {
    const request: CreateCardRequest = {
      deckId,
      type: data.isQuiz ? 1 : 0,
      name: data.name,
      content: data.content || undefined,
      question: data.question || undefined,
      answer: data.answer || undefined,
    };
    onCreate(request);
    reset();
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
          <div className="flex items-center justify-between  pb-3 border-b border-gray-200">
            <h2 className="text-[16px] font-bold text-gray-900">
              カードを新規作成
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[14px]">クイズモード</span>
              <input
                type="checkbox"
                className="checkbox"
                {...register('isQuiz')}
              />
            </label>
          </div>

          <div className="mb-4">
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
              placeholder="例: 基本情報技術者試験 第1章"
              className="input input-bordered w-full"
            />
            {errors.name && (
              <p className="text-red-500 text-[12px] mt-1">
                {errors.name.message}
              </p>
            )}
          </div>
          {!isQuiz && (
            <>
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
            </>
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
