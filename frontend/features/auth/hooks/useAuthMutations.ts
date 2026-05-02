// ログイン / 新規登録の API 呼び出し口。
// 中身はプレースホルダなので、TanStack Query や fetch ラッパに差し替えてください。

'use client';

import type { LoginValues } from '../components/LoginForm';
import type { RegisterValues } from '../components/RegisterForm';

export function useAuthMutations() {
  const login = async (values: LoginValues) => {
    // TODO: POST /auth/login
    //   const res = await apiClient.post("/auth/login", values);
    //   tokenStore.set(res.token);
    //   router.push("/decks");
    console.log('[useAuthMutations] login', values);
  };

  const register = async (values: RegisterValues) => {
    // TODO: POST /auth/register
    //   バリデーション: values.password === values.passwordConfirm
    //   成功時は login と同様にトークン保存 → /decks へ遷移、
    //   もしくは「ログインタブへ切り替え」のどちらかをプロダクト方針で選択。
    console.log('[useAuthMutations] register', values);
  };

  return { login, register };
}
