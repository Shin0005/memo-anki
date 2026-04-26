import Header from '@/components/Header';

export default function DecksLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header userName={'あとでzustand'} />
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );
}
