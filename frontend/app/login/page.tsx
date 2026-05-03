// /login = ログイン / 新規登録画面。
//
// 役割:
//   - 中央にロゴ + タブ + フォームのカードを表示する
//   - 下部にフッター（© memo-anki）を表示する
//
// このページは (main) レイアウトに属さないため、共通ヘッダーは表示しない想定です。
// ログイン中の場合は middleware 等で /decks にリダイレクトしてください。

import AuthCard from '@/features/auth/components/AuthCard';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f8] text-gray-800">
      {/* 中央カード */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <AuthCard />
      </main>

      {/* Footer（共通） */}
      <footer className="border-t border-gray-200">
        <div className="text-center text-[12px] text-gray-500 py-3">
          © 2026 memo-anki | Created by araki
        </div>
      </footer>
    </div>
  );
}
