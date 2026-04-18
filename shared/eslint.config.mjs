import baseConfig from '../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,    // v8以上の場合
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
];