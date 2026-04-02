import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // これを有効にすることで、Jestと同じ感覚でグローバルに関数を使ええる
    environment: 'node',
  },
});
