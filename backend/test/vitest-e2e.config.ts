import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'], // E2Eテストファイルを対象にする
    globals: true,
    environment: 'node',
    alias: {
      // src配下のインポートパスを通すための設定
      '@': path.resolve(__dirname, '../src'),
    },
    // 必要に応じてセットアップファイルを指定
    // setupFiles: ['./test/setup-e2e.ts'],
  },
});
