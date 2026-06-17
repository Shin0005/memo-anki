'use client';

type Props = {
  databaseName: string;
  columnName: string;
  onBack: () => void;
  onImport: () => void;
};

/** Step3: 取り込み内容の最終確認（表示・フッター操作） */
export default function ConfirmStep({
  databaseName,
  columnName,
  onBack,
  onImport,
}: Props) {
  return (
    <>
      <div className="mt-4 py-2">
        <dl className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[14px]">
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-gray-500">対象DB</dt>
            <dd className="font-semibold text-gray-900">{databaseName}</dd>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <dt className="text-gray-500">対象カラム</dt>
            <dd className="font-semibold text-gray-900">{columnName}</dd>
          </div>
        </dl>
        <p className="mt-4 text-center text-[14px] text-gray-700">
          この内容でインポートしますか？
        </p>
      </div>

      <div className="mt-6 flex justify-between gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          戻る
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onImport}
        >
          インポート
        </button>
      </div>
    </>
  );
}
