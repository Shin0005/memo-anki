/**
 * 暗号化エラークラス
 */
export class TokenCipherError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}
