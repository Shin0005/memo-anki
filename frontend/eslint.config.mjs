import { FlatCompat } from '@eslint/eslintrc';
import baseConfig from '../eslint.config.mjs';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  ...baseConfig,
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    settings: {
      react: { version: 'detect' },
    },
    languageOptions: {
      parserOptions: {
        projectService: true,    // v8以上の場合
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Next.js の App Router では named export が必須のケースがある
      'import/no-default-export': 'off',
      // React 19 では import React 不要
      'react/react-in-jsx-scope': 'off',
    },
  },
];