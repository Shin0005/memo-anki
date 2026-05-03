import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  // NestJS の @Injectable() 等のデコレータは emitDecoratorMetadata が必要。
  // esbuild（vitestのデフォルト）はこれを出力しないため、SWCでトランスパイルする。
  // unplugin-swc は backend/package.json の devDependencies に含まれている。
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    environment: 'node',
  },
});
