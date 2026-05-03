import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  username: string | null;
  setAuth: (token: string, username: string) => void;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  // 処理を定義している。ファイル読み込み時にこの値で初期化される
  // usernameをzustandとlocalStorageに保存。
  persist(
    (set) => ({
      accessToken: null,
      username: null,
      setAuth: (token, username) => set({ accessToken: token, username }),
      setAccessToken: (token) => set({ accessToken: token }),
      clearAuth: () => set({ accessToken: null, username: null }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage), // storage種類を選択
      // ATをzustandに保存（localStorageはXSS対象なのでATは含めない）
      partialize: (state) => ({ username: state.username }),
    },
  ),
);
