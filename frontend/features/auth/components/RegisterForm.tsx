// 新規登録フォーム。
// 元 HTML の #panel-register の中身そのまま（メール + パスワード + パスワード確認 + 登録ボタン）。

'use client';

import { useState } from 'react';
import type { RegisterValues } from '../types/auth';

type RegisterFormProps = {
  onSubmit: (values: RegisterValues) => void;
};

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password, passwordConfirm });
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

      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          パスワード
        </label>
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
      </div>

      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          パスワード（確認）
        </label>
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="auth-input"
        />
      </div>

      <button type="submit" className="auth-btn-primary">
        登録する
      </button>
    </form>
  );
}
