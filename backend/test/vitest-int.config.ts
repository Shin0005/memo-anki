import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/*.integration-spec.ts'], // 結合テストファイルを対象にする
    globals: true,
    environment: 'node',
    alias: {
      // src配下のインポートパスを通すための設定
      '@': path.resolve(__dirname, '../src'),
    },
    // 並列実行を無効化し、1つのプロセスで順番にテストを行う設定
    fileParallelism: false,

    // 使用するワーカー（プロセス/スレッド）の最大数を1に固定
    maxWorkers: 1,

    // ファイル内のテストも順番に実行
    sequence: {
      concurrent: false,
    },
    // 必要に応じてセットアップファイルを指定
    // setupFiles: ['./test/setup-e2e.ts'],
  },
});
