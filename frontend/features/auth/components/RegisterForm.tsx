// 新規登録フォーム。
// 元 HTML の #panel-register の中身そのまま（メール + パスワード + パスワード確認 + 登録ボタン）。

'use client';

import { useState } from 'react';

export type RegisterValues = {
  username: string;
  password: string;
  passwordConfirm: string;
};

type RegisterFormProps = {
  onSubmit: (values: RegisterValues) => void;
};

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ username, password, passwordConfirm });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          ユーザー名
        </label>
        <input
          type="text"
          required
          maxLength={30}
          autoComplete="username"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
