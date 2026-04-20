import { z } from 'zod';
import { notBlankString } from './common';

// ========================================
// リクエストスキーマ
// ========================================

export const RegisterRequestSchema = z
  .object({
    username: notBlankString('ユーザ名').max(
      30,
      '30文字以内で入力してください',
    ),

    password: notBlankString('パスワード')
      .min(8, '8文字以上で入力してください')
      .max(64, '64文字未満で入力してください'),

    email: z
      .string()
      .email('有効なメールアドレスを入力してください')
      .max(255, '255文字以内で入力してください')
      .optional(),
  })
  .strict(); // ← 未定義のプロパティを拒否

export const LoginRequestSchema = z
  .object({
    username: notBlankString('ユーザ名').max(
      30,
      '30文字以内で入力してください',
    ),
    password: notBlankString('パスワード').max(
      64,
      '64文字未満で入力してください',
    ),
  })
  .strict(); // ← 未定義のプロパティを拒否

// ========================================
// レスポンススキーマ
// ========================================

export const AuthResponseSchema = z.object({
  username: z.string(),
  email: z.string().optional(),
  accessToken: z.string(),
});

// ========================================
// TypeScript型のエクスポート
// ========================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
