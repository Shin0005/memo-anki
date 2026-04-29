'use client';

import { useForm } from 'react-hook-form';
import { components } from '@memo-anki/shared';

type Card = components['schemas']['CardResponse'];

type FormValues = {
  name: string;
  description: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialCard: Card;
  onSave: (data: FormValues) => void;
};

export default function CardEditModal({
  open,
  onClose,
  initialCard,
  onSave,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: initialCard.name,
      description: String(initialCard.content ?? initialCard.question ?? ''),
    },
  });

  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormValues) => {
    onSave({
      name: data.name.trim(),
      description: data.description.trim(),
    });
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
        <div className="px-6 pt-5 pb-3 border-b border-gray-200">
          <h2 className="text-[16px] font-bold text-gray-900">カードを編集</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">
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
              内容
            </label>
            <textarea
              {...register('description', {
                maxLength: {
                  value: 10000,
                  message: '10000文字以内で入力してください',
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
              onClick={handleClose}
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
