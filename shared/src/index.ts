// api.ts は openapi.json から自動生成される。初回 build 時には存在しない場合があり、
// その場合は package.json の prebuild フックで空 stub が用意される（後で本物に上書き）。
// サブパス '@memo-anki/shared/api' でも参照可能（こちらが推奨の入り口）。
export type * from './api';
export * from './enums';
