import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { TokenCipherError } from '../exceptions/cipher.exceptions';

/**
 * AES-256-GCMによるトークン暗号化/復号サービス
 */
@Injectable()
export class CipherService implements OnModuleInit {
  private readonly logger = new Logger(CipherService.name);

  // 32バイトの暗号鍵（onModuleInit時に設定される）
  private key!: Buffer;

  // GCMの推奨IV長（12バイト）
  private static readonly IV_LENGTH = 12;
  // GCMの認証タグ長（16バイト）
  private static readonly AUTH_TAG_LENGTH = 16;

  // CIのOpenAPIスキーマ生成時用の特別処理
  onModuleInit() {
    // OpenAPI生成スクリプトはAppModule全体を初期化するため、
    // 鍵が無くても起動できるようにスキップする（PrismaServiceと同様の方針）
    if (process.env.GENERATE_OPENAPI === 'true') {
      this.logger.warn('CIのため暗号鍵チェックをスキップします');
      return;
    }
    // CIは読み込まれないためgithubのsecretに記載したうえでCIにenvを追加した。
    this.key = Buffer.from(process.env.NOTION_TOKEN_ENC_KEY!, 'hex');
  }

  /**
   * 平文を暗号化してbase64文字列で返す
   * @param plaintext 平文
   * @returns base64
   */
  encrypt(plaintext: string): string {
    try {
      // 暗号化のたびにランダムなIVを生成（毎回新規）
      const iv = randomBytes(CipherService.IV_LENGTH);
      const cipher = createCipheriv('aes-256-gcm', this.key, iv);

      // 暗号化
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // 認証タグ（改ざん検出用）を取得
      const authTag = cipher.getAuthTag();

      // 結合してbase64化
      return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
    } catch (e) {
      throw new TokenCipherError('暗号化に失敗しました', e);
    }
  }

  /**
   * 暗号化済みbase64文字列を復号して平文を返す
   * @param encoded
   * @returns 平文
   */
  decrypt(encoded: string): string {
    try {
      const buf = Buffer.from(encoded, 'base64');

      // 結合バイト列を分解
      const iv = buf.subarray(0, CipherService.IV_LENGTH);
      const authTag = buf.subarray(
        CipherService.IV_LENGTH,
        CipherService.IV_LENGTH + CipherService.AUTH_TAG_LENGTH,
      );
      const ciphertext = buf.subarray(
        CipherService.IV_LENGTH + CipherService.AUTH_TAG_LENGTH,
      );

      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);

      // 復号（authTag不一致時はここで例外）
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return plaintext.toString('utf8');
    } catch (e) {
      throw new TokenCipherError('復号に失敗しました', e);
    }
  }
}
