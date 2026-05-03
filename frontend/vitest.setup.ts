// Vitest の起動時に毎回読み込まれるセットアップファイル
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  // 各テスト間で DOM が残らないようにする
  cleanup();
});
