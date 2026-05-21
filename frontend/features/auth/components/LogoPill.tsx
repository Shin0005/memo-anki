// memo-anki のロゴ画像。
import Image from 'next/image';

const LOGO_WIDTH = 310;
const LOGO_HEIGHT = 90;

export default function LogoPill() {
  return (
    <Image
      src="/memo-anki-logo.png"
      alt="memo-anki"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority // ログイン画面で最初に見える要素なので優先読み込み
      className="inline-block rounded-2xl"
    />
  );
}
