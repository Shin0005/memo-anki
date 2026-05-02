// 新規登録フォーム。
// 元 HTML の #panel-register の中身そのまま（メール + パスワード + パスワード確認 + 登録ボタン）。

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export type RegisterValues = {
  username: string;
  password: string;
  email?: string;
};

type RegisterFormProps = {
  onSubmit: (values: RegisterValues) => void;
};

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast.error('パスワードが一致しません');
      return;
    }
    onSubmit({
      username,
      password,
      email: email.trim() === '' ? undefined : email.trim(),
    });
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

      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          パスワード
        </label>
        <input
          type="password"
          required
          minLength={8}
          maxLength={64}
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          パスワード（確認）
        </label>
        <input
          type="password"
          required
          minLength={8}
          maxLength={64}
          autoComplete="new-password"
          placeholder="••••••••"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>

      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          メールアドレス（任意）
        </label>
        <input
          type="email"
          autoComplete="email"
          placeholder="example@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full">
        登録する
      </button>
    </form>
  );
}
