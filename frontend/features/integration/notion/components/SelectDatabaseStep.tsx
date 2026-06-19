'use client';

import { components } from '@memo-anki/shared';

type NotionDatabaseItem = components['schemas']['NotionDatabaseItem'];

type Props = {
  databases: NotionDatabaseItem[];
  selectedDb: NotionDatabaseItem | null;
  onSelect: (db: NotionDatabaseItem) => void;
  isLoading: boolean;
  onCancel: () => void;
  onNext: () => void;
  isNextLoading: boolean;
};

/** Step1: 取り込み元のNotion DBを1件選択する（表示・入力・フッター操作） */
export default function SelectDatabaseStep({
  databases,
  selectedDb,
  onSelect,
  isLoading,
  onCancel,
  onNext,
  isNextLoading,
}: Props) {
  let content;
  if (isLoading) {
    content = (
      <div className="flex items-center justify-center py-10 text-gray-500">
        <span className="loading loading-spinner loading-md mr-2" />
        読み込み中...
      </div>
    );
  } else if (databases.length === 0) {
    content = (
      <p className="py-10 text-center text-[13px] text-gray-500">
        共有されたデータベースがありません。
        <br />
        Notion側で連携先にデータベースを共有してください。
      </p>
    );
  } else {
    content = (
      <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto py-1">
        {/* DB選択リスト */}
        {databases.map((db) => (
          <button
            key={db.id}
            type="button"
            onClick={() => onSelect(db)}
            //選択
            className={`w-full rounded-lg border px-4 py-3 text-left text-[14px] transition ${
              selectedDb?.id === db.id
                ? 'border-primary bg-primary/10 font-semibold text-gray-900'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {db.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4">{content}</div>

      {/* フッター */}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onNext}
          disabled={!selectedDb || isNextLoading}
        >
          {isNextLoading ? '読み込み中...' : '次へ'}
        </button>
      </div>
    </>
  );
}
