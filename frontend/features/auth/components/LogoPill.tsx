// memo-anki のロゴ pill。
// 元 HTML の .logo-pill（黒背景 / 白文字 / 角丸 / pill 形状）をそのまま再現。

export default function LogoPill() {
  return (
    <span
      className="inline-block bg-slate-900 text-white font-bold rounded-lg"
      style={{
        padding: '6px 14px',
        fontSize: '18px',
        letterSpacing: '0.01em',
      }}
    >
      memo-anki
    </span>
  );
}
