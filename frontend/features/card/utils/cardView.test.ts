// ただのコンポーネントだが分岐が多いので実施
import { describe, it, expect } from 'vitest';
import { buildCardDetail, formatDate } from './cardView';

// CardResponseはOpenAPI由来の型だが、テストでは必要最小のフィールドだけ渡す
type CardLike = Parameters<typeof buildCardDetail>[0];
const makeCard = (overrides: Partial<CardLike>): CardLike =>
  overrides as unknown as CardLike;

// カードの確認
describe('buildCardDetail', () => {
  it('type が 0 (NOTE) のとき content をそのまま返す', () => {
    const card = makeCard({ type: 0, content: 'これはノートです' });
    expect(buildCardDetail(card)).toBe('これはノートです');
  });

  it('type が 0 で content が未設定なら空文字を返す', () => {
    const card = makeCard({ type: 0 });
    expect(buildCardDetail(card)).toBe('');
  });

  it('type が 1 (QUIZ) のとき Q と A を結合した文字列を返す', () => {
    const card = makeCard({
      type: 1,
      question: 'WWWとは？',
      answer: 'World Wide Web',
    });
    expect(buildCardDetail(card)).toBe('Q: WWWとは？  A: World Wide Web');
  });

  // 片方しか入っていない場合は空文字を filter で除去する仕様
  it('type が 1 で answer のみ未設定なら Q だけを返す', () => {
    const card = makeCard({ type: 1, question: 'WWWとは？' });
    expect(buildCardDetail(card)).toBe('Q: WWWとは？');
  });
});

// フォーマット形式の確認
describe('formatDate', () => {
  // ロケールによって出力フォーマットが微妙に異なるので、ゼロパディング桁数の確認をする
  it('ISO 文字列をja-JPに整形する', () => {
    const result = formatDate('2026-05-03T09:30:00Z');
    // 2桁ゼロパディングが効いていることを確認 (例: "2026/05/03 18:30")
    // タイムゾーンによって時刻が変わるため厳密一致は避け、年/月日が含まれることだけ検証
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/05/);
  });

  it('不正な文字列はそのまま返す', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
