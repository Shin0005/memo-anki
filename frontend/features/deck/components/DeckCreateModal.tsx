'use client';

import { useForm } from 'react-hook-form';
import { components } from '@memo-anki/shared';

type CreateDeckRequest = components['schemas']['CreateDeckRequest'];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (deck: CreateDeckRequest) => void;
};

// バッファー（そのままREQUESTを使わない）
type FormValues = {
  name: string;
  description: string;
};

export default function DeckCreateModal({ open, onClose, onCreate }: Props) {
  // RHFのテンプレ
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: '', description: '' } });

  // RHFは一番上でないといけないのでescapeをその下に配置
  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  // submitをトリガーとしてバリデーション後に関数実行
  // そのための実行関数
  const onSubmit = (data: FormValues) => {
    onCreate({
      name: data.name.trim(),
      description: data.description.trim() || undefined,
    });
    reset();
    onClose();
  };

  return (
    /* 背景 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={handleClose}
    >
      {/* モーダル（モーダル内は伝搬を止める） */}
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-gray-200">
          <h2 className="text-[16px] font-bold text-gray-900">
            デッキを新規作成
          </h2>
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
              placeholder="例: 基本情報技術者試験"
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
              placeholder="このデッキの内容や目的を簡単に書きます"
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
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
