import { components } from '@memo-anki/shared';

type Card = components['schemas']['CardResponse'];

export function buildCardDetail(card: Card): string {
  if (card.type === 0) return String(card.content ?? '');
  const q = card.question ? `Q: ${String(card.question)}` : '';
  const a = card.answer ? `A: ${String(card.answer)}` : '';
  return [q, a].filter(Boolean).join('  '); // 空白を除去してq,a結合
}
// 単純なフォーマット utilsへ共有関数化するかも
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
