'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { apiClient } from '@/lib/api/client';

type HeaderProps = {
  userName: string;
};

export default function Header({ userName }: HeaderProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = async () => {
    //hooksには切り出さない。ログアウトをサーバーに伝えるだけで冗長になる。
    await apiClient('/auth/logout', 'POST').catch(() => {});

    // apiClientでエラー処理は行われるため握り潰し。以下はエラーでも実行する。
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="w-full border-b border-gray-200">
      <div className="flex items-center justify-between px-5 py-4.5">
        <span className="bg-slate-900 text-white font-bold px-2.5 py-1 rounded-md text-[13px]">
          memo-anki
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-gray-700">{userName}</span>
          <button onClick={handleLogout} className="btn btn-ghost btn-xs">
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
