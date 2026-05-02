// ログインフォーム。
// 元 HTML の #panel-login の中身そのまま（メール + パスワード + ログインボタン）。

'use client';

import { useState } from 'react';

export type LoginValues = {
  username: string;
  password: string;
};

type LoginFormProps = {
  onSubmit: (values: LoginValues) => void;
};

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ username, password });
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
          className="input input-bordered w-full"
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
          className="input input-bordered w-full"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full">
        ログイン
      </button>
    </form>
  );
}
