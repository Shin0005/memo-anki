import { redirect } from 'next/navigation';

// ルート("/")にアクセスされたら /login に飛ばす。
export default function Home() {
  redirect('/login');
}
