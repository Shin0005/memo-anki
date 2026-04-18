import baseConfig from '../eslint.config.mjs';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        projectService: true,    // v8以上の場合
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NestJS の DI では constructor で初期化しないプロパティがある
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];