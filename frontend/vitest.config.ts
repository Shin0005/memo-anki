// React Testing Library を使うので jsdom 環境を選択
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // React コンポーネント (JSX/TSX) をテストでビルドできるようにする
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    // describe/it/expect/viを使えるようにする
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
