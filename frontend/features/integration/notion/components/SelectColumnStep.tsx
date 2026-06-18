'use client';

import { components } from '@memo-anki/shared';

type NotionColumnItem = components['schemas']['NotionColumnItem'];

type Props = {
  columns: NotionColumnItem[];
  selectedColumn: string | null;
  onSelect: (columnName: string) => void;
  onBack: () => void;
  onNext: () => void;
};

/** 本文として取り込めるカラム型 */
const IMPORTABLE_TYPES = ['title', 'rich_text'];

/** Step2: 本文に使うカラムを1件選択する（表示・入力・フッター操作） */
export default function SelectColumnStep({
  columns,
  selectedColumn,
  onSelect,
  onBack,
  onNext,
}: Props) {
  // 本文として取り込めるテキスト系カラムのみ表示する
  const importableColumns = columns.filter((c) =>
    IMPORTABLE_TYPES.includes(c.type),
  );

  let content;
  if (importableColumns.length === 0) {
    content = (
      <p className="py-10 text-center text-[13px] text-gray-500">
        取り込み可能なカラムがありません。
        <br />
        テキスト（title / rich_text）型のカラムが必要です。
      </p>
    );
  } else {
    content = (
      <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto py-1">
        {importableColumns.map((column) => (
          <button
            key={column.name}
            type="button"
            onClick={() => onSelect(column.name)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-[14px] transition ${
              selectedColumn === column.name
                ? 'border-primary bg-primary/10 font-semibold text-gray-900'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{column.name}</span>
            <span className="text-[11px] text-gray-400">{column.type}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4">{content}</div>

      {/* フッター */}
      <div className="mt-6 flex justify-between gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          戻る
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onNext}
          disabled={!selectedColumn}
        >
          次へ
        </button>
      </div>
    </>
  );
}
