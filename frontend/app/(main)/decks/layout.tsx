'use client';

import Header from '@/components/Header';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function DecksLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const username = useAuthStore((s) => s.username);

  return (
    <>
      <Header userName={username ?? ''} />
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );
}
