'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { components } from '@memo-anki/shared';

type DeckResponse = components['schemas']['DeckResponse'];
type UpdateDeckRequest = components['schemas']['UpdateDeckRequest'];

type Props = {
  open: boolean;
  onClose: () => void;
  initialDeck: DeckResponse;
  onSave: (values: UpdateDeckRequest) => void;
};

type FormValues = {
  name: string;
  description: string;
};
/** CreateModalにカラム値初期設定しただけ */
export default function DeckUpdateModal({
  open,
  onClose,
  initialDeck,
  onSave,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  // 閉じるたびに編集対象のデッキ情報をフォームにセット
  useEffect(() => {
    if (open) {
      reset({
        name: initialDeck.name,
        description: initialDeck.description ?? '',
      });
    }
  }, [open, initialDeck, reset]);

  if (!open) return null;

  const onSubmit = (data: FormValues) => {
    onSave({
      name: data.name.trim(),
      description: data.description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-gray-200">
          <h2 className="text-[16px] font-bold text-gray-900">デッキを編集</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              デッキ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              {...register('name', {
                required: 'デッキ名は必須です',
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

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              説明
            </label>
            <textarea
              {...register('description', {
                maxLength: {
                  value: 200,
                  message: '200文字以内で入力してください',
                },
              })}
              className="textarea textarea-bordered w-full min-h-[88px]"
            />
            {errors.description && (
              <p className="text-red-500 text-[12px] mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
            >
              戻る
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
