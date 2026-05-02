// ロゴ + タブ + フォームをまとめた中央カード。
// タブ切り替えはここの useState で持つ。
// 元 HTML の <main> 内の中央カード部分に対応。

'use client';

import { useState } from 'react';
import LogoPill from './LogoPill';
import AuthTabs, { type AuthTab } from './AuthTabs';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useAuthMutations } from '../hooks/useAuthMutations';

export default function AuthCard() {
  const [tab, setTab] = useState<AuthTab>('login');
  const { login, register } = useAuthMutations();

  return (
    <div className="w-full max-w-[400px]">
      {/* ロゴ */}
      <div className="flex justify-center mb-8">
        <LogoPill />
      </div>

      {/* カード本体 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <AuthTabs active={tab} onChange={setTab} />

        <div className="px-8 py-7">
          {tab === 'login' ? (
            <LoginForm onSubmit={login} />
          ) : (
            <RegisterForm onSubmit={register} />
          )}
        </div>
      </div>
    </div>
  );
}
