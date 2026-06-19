'use client';

import { useEffect, useState } from 'react';
import { components } from '@memo-anki/shared';
import { useNotionDatabases } from '../hooks/useNotionDatabases';
import { useNotionColumns } from '../hooks/useNotionColumns';
import { useNotionImport } from '../hooks/useNotionImport';
import { useNotionErrorHandler } from '../hooks/useNotionErrorHandler';
import SelectDatabaseStep from './SelectDatabaseStep';
import SelectColumnStep from './SelectColumnStep';
import ConfirmStep from './ConfirmStep';

type NotionDatabaseItem = components['schemas']['NotionDatabaseItem'];
type NotionColumnItem = components['schemas']['NotionColumnItem'];

type Step = 'select-db' | 'select-column' | 'confirm' | 'importing';

type Props = {
  open: boolean;
  deckId: string;
  onClose: () => void;
};

/**
 * Notionインポートモーダル（Step管理）
 *
 * 親が状態管理（DB,カラム含む）とAPI呼び出しを担い、各Stepコンポーネントは表示と入力のみを担当する。
 * DB選択 → カラム選択 → 確認 → 実行中 の順に遷移する。
 */
export default function NotionImportModal({ open, deckId, onClose }: Props) {
  const [step, setStep] = useState<Step>('select-db');
  const [selectedDb, setSelectedDb] = useState<NotionDatabaseItem | null>(null);
  const [columns, setColumns] = useState<NotionColumnItem[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  // DB一覧を取得する（モーダルが開かれたときに実行）
  const {
    data: databases,
    isLoading: isDatabasesLoading,
    isError: isDatabasesError,
    error: databasesError,
  } = useNotionDatabases(open);

  // 共通のエラーハンドラ（バックエンドのメッセージ表示・再連携要求の判別）
  const handleError = useNotionErrorHandler();

  // DB一覧取得 useQuery には onError がないため、ここでエラーを通知する
  useEffect(() => {
    if (!isDatabasesError) return;
    handleError(databasesError);
  }, [isDatabasesError, databasesError, handleError]);

  // カラム取得フック
  const fetchColumns = useNotionColumns();
  // Cardsへのインポートフック
  const importNotion = useNotionImport();

  if (!open) return null;

  // 閉じる際に状態を初期化する
  const handleClose = () => {
    setStep('select-db');
    setSelectedDb(null);
    setColumns([]);
    setSelectedColumn(null);
    onClose();
  };

  // ステップごとのボタンのフック

  // Step1 DB一覧 → カラム一覧
  // 次に使うデータがあるかチェック後にカラムを取得してステップを進める。
  const handleDbToColumn = async () => {
    if (!selectedDb) return;
    try {
      const result = await fetchColumns.mutateAsync(selectedDb.id);
      setColumns(result.columns);
      // DBを選び直した場合に前回のカラム選択が残らないようリセットする
      setSelectedColumn(null);
      setStep('select-column');
    } catch {
      // トーストは useNotionColumns 側で表示。DB選択に留まる
    }
  };

  // Step2 カラム一覧 → 確認画面
  // 次に使うデータがあるかチェック後にカラム選択してステップを進める。
  const handleColumnToconfirm = () => {
    if (!selectedColumn) return;
    setStep('confirm');
  };

  // Step3 確認画面 → インポート中画面
  // 次に使うデータがあるかチェック後にインポートしてモーダルを初期化する。
  const handleconfirmToImport = async () => {
    if (!selectedDb || !selectedColumn) return;
    setStep('importing');
    try {
      await importNotion.mutateAsync({
        databaseId: selectedDb.id,
        deckId,
        columnName: selectedColumn,
      });
      handleClose();
    } catch {
      // 失敗時は確認画面に戻して再試行可能にする（トーストはhook側）
      setStep('confirm');
    }
  };

  const titleByStep: Record<Step, string> = {
    'select-db': 'インポートするデータベースを選択',
    'select-column': '取り込むカラムを選択',
    confirm: 'インポート内容の確認',
    importing: 'インポート中',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ステップタイトル */}
        <div className="px-6 py-5">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-[16px] font-bold text-gray-900">
              {titleByStep[step]}
            </h2>
          </div>

          {/* 各ステップ（コンテンツとフッターはステップ内で完結） */}
          {step === 'select-db' && (
            <SelectDatabaseStep
              databases={databases?.databases ?? []}
              selectedDb={selectedDb}
              onSelect={setSelectedDb}
              isLoading={isDatabasesLoading}
              onCancel={handleClose}
              onNext={handleDbToColumn}
              isNextLoading={fetchColumns.isPending}
            />
          )}

          {step === 'select-column' && (
            <SelectColumnStep
              columns={columns}
              selectedColumn={selectedColumn}
              onSelect={setSelectedColumn}
              onBack={() => setStep('select-db')}
              onNext={handleColumnToconfirm}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              databaseName={selectedDb?.title ?? ''}
              columnName={selectedColumn ?? ''}
              onBack={() => setStep('select-column')}
              onImport={handleconfirmToImport}
            />
          )}

          {step === 'importing' && (
            <div className="mt-4 flex flex-col items-center justify-center gap-3 py-10 text-gray-600">
              <span className="loading loading-spinner loading-lg" />
              <p className="text-[14px]">インポート中...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
