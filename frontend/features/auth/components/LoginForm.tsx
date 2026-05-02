// ログインフォーム。
// 元 HTML の #panel-login の中身そのまま（メール + パスワード + ログインボタン）。

'use client';

import { useState } from 'react';
import type { LoginValues } from '../types/auth';

type LoginFormProps = {
  onSubmit: (values: LoginValues) => void;
};

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          メールアドレス
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="example@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </div>

      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          パスワード
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
      </div>

      <button type="submit" className="auth-btn-primary">
        ログイン
      </button>
    </form>
  );
}
