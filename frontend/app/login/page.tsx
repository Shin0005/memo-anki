import AuthCard from '@/features/auth/components/AuthCard';

export default function LoginPage() {
  return (
    // body(min-h-screen flex flex-col) に乗っかって残り空間を埋める
    <div className="flex-1 flex flex-col bg-[#f7f7f8] text-gray-800">
      {/* 中央カード */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <AuthCard />
      </main>
    </div>
  );
}
