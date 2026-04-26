type HeaderProps = {
  userName: string;
};

export default function Header({ userName }: HeaderProps) {
  return (
    <header className="w-full border-b border-gray-200">
      <div className="flex items-center justify-between px-5 py-4.5">
        {/* ロゴ 将来的に画像ロゴにする*/}
        <span className="bg-slate-900 text-white font-bold px-2.5 py-1 rounded-md text-[13px]">
          memo-anki
        </span>

        {/* ユーザー名 */}
        <span className="text-[13px] text-gray-700">{userName}</span>
      </div>
    </header>
  );
}
