'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { components } from '@memo-anki/shared';
import { apiClient } from '@/lib/api/client';
import { HttpError } from '@/lib/api/httpError';
import { HttpStatus } from '@/lib/api/statusCodes';
import { useAuthStore } from '@/lib/store/useAuthStore';

type LoginRequest = components['schemas']['LoginRequest'];
type RegisterRequest = components['schemas']['RegisterRequest'];
type AuthResponse = components['schemas']['AuthResponse'];

export const useAuthMutations = () => {
  const router = useRouter();
  // zustandからsetAuth()を取り出す
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSuccess = (res: AuthResponse) => {
    setAuth(res.accessToken, res.username); //zustandにセット
    router.push('/decks');
  };

  const handleLoginError = (err: unknown) => {
    if (err instanceof HttpError) {
      switch (err.statusCode) {
        case HttpStatus.UNAUTHORIZED:
          toast.error('ユーザー名またはパスワードが間違っています');
          break;
        case HttpStatus.BAD_REQUEST:
          toast.error('正しい形式で入力してください');
          break;
        default:
          toast.error('サーバーエラーが発生しました');
      }
    } else {
      toast.error('ネットワークエラーが発生しました');
    }
  };

  const handleRegisterError = (err: unknown) => {
    if (err instanceof HttpError) {
      switch (err.statusCode) {
        case HttpStatus.CONFLICT:
          toast.error('このユーザー名は既に使用されています');
          break;
        case HttpStatus.BAD_REQUEST:
          toast.error('正しい形式で入力してください');
          break;
        default:
          toast.error('サーバーエラーが発生しました');
      }
    } else {
      toast.error('ネットワークエラーが発生しました');
    }
  };

  const login = useMutation({
    mutationFn: (data: LoginRequest) =>
      apiClient('/auth/login', 'POST', data) as Promise<AuthResponse>,
    onSuccess: handleSuccess,
    onError: handleLoginError,
  });

  const register = useMutation({
    mutationFn: (data: RegisterRequest) =>
      apiClient('/auth/register', 'POST', data) as Promise<AuthResponse>,
    onSuccess: handleSuccess,
    onError: handleRegisterError,
  });

  return { login, register };
};
