'use client';

import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { refreshAccessToken } from '@/lib/api/client';

/**
 * アプリ起動時にrefresh実行。
 * 取得できないときは情報を破棄。
 * 取得できるときはATを更新。
 */
function AuthInitializer() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    refreshAccessToken()
      .then((token) => setAccessToken(token)) //zustandにAT保存
      .catch(() => clearAuth()); // 失敗でAT, Username初期化
  }, []);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      {children}
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
