// memo-anki のロゴ画像。
import Image from 'next/image';

// デフォルト値
const LOGO_WIDTH = 310;
const LOGO_HEIGHT = 90;

type LogoPillProps = {
  width: number | undefined;
  height: number | undefined;
};

export default function LogoPill({ width, height }: LogoPillProps) {
  return (
    <Image
      src="/memo-anki-logo.png"
      alt="memo-anki"
      width={width || LOGO_WIDTH}
      height={height || LOGO_HEIGHT}
      priority // ログイン画面で最初に見える要素なので優先読み込み
      className="inline-block rounded-2xl"
    />
  );
}
