import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardCreateModal from './CardCreateModal';

// onCreateのスパイ
const onCreate = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
  onCreate.mockReset();
  onClose.mockReset();
});

// デフォルトopen={true}で表示する
const renderModal = () =>
  render(
    <CardCreateModal
      open={true}
      deckId="1"
      onClose={onClose}
      onCreate={onCreate}
    />,
  );

describe('CardCreateModal', () => {
  // ユーザーが最初に開いたときに見えるフォームの確認
  it('初期状態 (isQuiz=false) では「内容」フィールドのみ表示される', () => {
    renderModal();
    expect(
      screen.getByPlaceholderText('内容を入力してください'),
    ).toBeInTheDocument();
    // QUIZ用のフィールドが表示されていないことを確認
    expect(
      screen.queryByPlaceholderText('例: WWWとは？'),
    ).not.toBeInTheDocument();
  });
  // typeモードの切り替え確認
  it('クイズモードにチェックを入れると Q/A フィールドが現れ content は消える', async () => {
    const user = userEvent.setup();
    renderModal();

    // チェックボックスをクリック
    await user.click(screen.getByRole('checkbox'));

    // Q/A用フィールドが表示される
    expect(screen.getByPlaceholderText('例: WWWとは？')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('例: World Wide Webの略称です'),
    ).toBeInTheDocument();
    // 切替後はcontentフィールドがDOMから消えている
    expect(
      screen.queryByPlaceholderText('内容を入力してください'),
    ).not.toBeInTheDocument();
  });

  // バリデーション確認
  it('カード名が空のまま保存しても onCreate は呼ばれない', async () => {
    const user = userEvent.setup();
    renderModal();

    // name を入力せず保存ボタンをクリック
    await user.click(screen.getByRole('button', { name: '保存' }));

    // onCreate が呼ばれていないことを確認
    expect(onCreate).not.toHaveBeenCalled();
    // バリデーションメッセージが表示されている
    expect(screen.getByText('カード名は必須です')).toBeInTheDocument();
  });

  it('カード名を入力して保存すると NOTE 形式で onCreate が呼ばれる', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(
      screen.getByPlaceholderText('例: 基本情報技術者試験 第1章'),
      'テストカード',
    );
    await user.type(
      screen.getByPlaceholderText('内容を入力してください'),
      '中身',
    );
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onCreate).toHaveBeenCalledWith({
      deckId: '1',
      // NOTE 選択時は type=0
      type: 0,
      name: 'テストカード',
      content: '中身',
      // 未入力フィールドは undefined で送られる
      question: undefined,
      answer: undefined,
    });
  });
});
