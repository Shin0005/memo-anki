'use client';

// client側の全体の設定
// ブラウザにあるuserContextのようなもの、client側なのでuseClientを明記
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  // useStateの初期化
  // 毎回インスタンス化させない
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
