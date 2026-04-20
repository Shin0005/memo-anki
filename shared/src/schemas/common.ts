import { z } from 'zod';

/**
 * 空白のみを拒否する文字列スキーマ。
 * trim後に1文字以上、max文字以下であることを保証する。
 * trim済みの値に変換されるため、DB保存時も前後の空白は除去される。
 *
 * @param max 最大文字数
 */
export const notBlankString = (fieldName: string) =>
  z
    .string({ required_error: `${fieldName}は必須です` })
    .trim()
    .min(1, `${fieldName}を入力してください`);
