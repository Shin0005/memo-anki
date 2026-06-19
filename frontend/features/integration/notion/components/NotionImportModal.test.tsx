// インポートモーダルの結合試験(Step遷移に伴う副作用のうち、フック単体では担保できないものに限定)
// ・import の二重実行防止(実行回数) ・失敗時の踏みとどまり(閉じない/壊さない) ・DB選び直し時の選択リセット(誤カラム送信防止)
// API引数・cards無効化・完了トースト自体は useNotionImport.test.ts で担保済み。UIの見た目は対象外。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { HttpError } from '@/lib/api/httpError';
import NotionImportModal from './NotionImportModal';

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const DATABASES = {
  databases: [
    { id: 'db-1', title: '学習メモ' },
    { id: 'db-2', title: '読書ログ' },
  ],
};
const COLUMNS = {
  databaseId: 'db-1',
  databaseTitle: '学習メモ',
  columns: [
    { name: 'Content', type: 'rich_text' },
    { name: 'Tags', type: 'select' },
    { name: 'Name', type: 'title' },
  ],
};

// apiClientをパス/メソッドで振り分ける。失敗/保留させたい呼び出しはオプションで指定する。
type FailOpts = { failImport?: boolean; hangImport?: boolean };
const setupApi = (opts: FailOpts = {}) => {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === '/integrations/notion/databases') {
      return Promise.resolve(DATABASES);
    }
    if (path.endsWith('/columns')) {
      return Promise.resolve(COLUMNS);
    }
    if (path.endsWith('/import')) {
      if (opts.hangImport) return new Promise(() => {}); // 解決しない(importing状態を保持)
      if (opts.failImport) return Promise.reject(new HttpError(500, 'imp'));
      return Promise.resolve({ count: 3 });
    }
    return Promise.reject(new Error(`unexpected ${path}`));
  });
};

const onClose = vi.fn();

// 各テストで新しい QueryClient を使う (キャッシュ汚染を避ける)
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, invalidateSpy };
};

const renderModal = (open = true) => {
  const { Wrapper, invalidateSpy } = createWrapper();
  render(<NotionImportModal open={open} deckId="deck-1" onClose={onClose} />, {
    wrapper: Wrapper,
  });
  return { invalidateSpy };
};

// import POST の呼び出し回数(=実行回数)
const importCallCount = () =>
  vi
    .mocked(apiClient)
    .mock.calls.filter((c) => String(c[0]).endsWith('/import')).length;

// 確認画面まで進める共通操作
const advanceToConfirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: '学習メモ' }));
  await user.click(screen.getByRole('button', { name: '次へ' }));
  // カラムボタンの名前は「カラム名 + 型」が結合される(例: "Content rich_text")
  await user.click(await screen.findByRole('button', { name: /Content/ }));
  await user.click(screen.getByRole('button', { name: '次へ' }));
  await screen.findByRole('button', { name: 'インポート' });
};

beforeEach(() => {
  vi.mocked(apiClient).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  onClose.mockReset();
});

describe('NotionImportModal - 二重実行防止', () => {
  it('インポート中はインポートボタンが消え、import POSTは1回しか呼ばれない', async () => {
    const user = userEvent.setup();
    setupApi({ hangImport: true }); // importを保留してimporting状態を維持
    renderModal();

    await advanceToConfirm(user);
    await user.click(screen.getByRole('button', { name: 'インポート' }));

    // importing表示に切り替わり、インポートボタンは存在しない(再発火不可)
    expect(await screen.findByText('インポート中...')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'インポート' }),
    ).not.toBeInTheDocument();
    expect(importCallCount()).toBe(1);
  });
});

describe('NotionImportModal - 失敗時の踏みとどまり/復帰', () => {
  it('インポート失敗時は確認画面に戻り、onCloseもcards無効化も起きない', async () => {
    const user = userEvent.setup();
    setupApi({ failImport: true });
    const { invalidateSpy } = renderModal();

    await advanceToConfirm(user);
    await user.click(screen.getByRole('button', { name: 'インポート' }));

    // エラートーストが出る
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // 確認画面に戻る(再試行可能)
    expect(
      await screen.findByRole('button', { name: 'インポート' }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['cards'],
      exact: false,
    });
  });
});

describe('NotionImportModal - 選択リセット', () => {
  it('DBを選び直すと前回のカラム選択は引き継がれない', async () => {
    const user = userEvent.setup();
    setupApi();
    renderModal();

    // 1周目: 学習メモ→Content選択→確認
    await advanceToConfirm(user);
    expect(screen.getByText('Content')).toBeInTheDocument();

    // 確認→カラム→DB選択へ戻る
    await user.click(screen.getByRole('button', { name: '戻る' })); // confirm→column
    await user.click(screen.getByRole('button', { name: '戻る' })); // column→db

    // 別DBを選んで次へ
    await user.click(screen.getByRole('button', { name: '読書ログ' }));
    await user.click(screen.getByRole('button', { name: '次へ' }));

    // カラム選択画面: selectedColumnがリセットされ「次へ」がdisabled
    const nextBtn = await screen.findByRole('button', { name: '次へ' });
    expect(nextBtn).toBeDisabled();
  });
});
