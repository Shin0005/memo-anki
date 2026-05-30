import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';
import { CipherService } from './cipher.service';
import { TokenCipherError } from '../exceptions/cipher.exceptions';

/**
 * 暗号化ロジックの単体試験
 *
 * 主に以下の観点で試験する
 * 正常系
 * - encryptした結果をdecryptすると元の平文に戻る
 * - 同じ平文を2回encryptしても結果が異なる（ランダムの検証）
 * - 返り値がbase64であること
 * 異常系
 * - encryptが失敗するとTokenCipherErrorを投げること
 * - decryptが失敗するとTokenCipherErrorを投げること
 * - 暗号文を改ざんするとTokenCipherErrorを投げること（改ざん検知）
 */

describe('CipherService', () => {
  let service: CipherService;

  // テスト全体で共通の鍵を使うため、ここで一度だけ初期化する
  beforeAll(() => {
    // AES-256-GCM 用の 32バイト鍵を hex 文字列で用意する
    process.env.NOTION_TOKEN_ENC_KEY = randomBytes(32).toString('hex');

    // Nest の DI を使わず、直接インスタンス化
    service = new CipherService();
    // this.keyにenvを読み込ませる
    service.onModuleInit();
  });

  //
  // 正常系
  //
  describe('正常系', () => {
    it('encrypt → decrypt で元の平文に戻ること', () => {
      const plaintext = 'secret-notion-token-abcdef';
      const encrypted = service.encrypt(plaintext);

      // 復号した結果が元の文字列と完全一致することを確認
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('同じ平文を2回encryptしても結果が異なること（ランダム性）', () => {
      // GCMは毎回ランダムなIVを使うため、同じ平文でも暗号文は別になる
      const plaintext = 'same-plaintext';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);

      // 暗号文同士は一致してはいけない
      expect(enc1).not.toBe(enc2);
      // 復号すれば両方とも同じ平文になる
      expect(service.decrypt(enc1)).toBe(plaintext);
      expect(service.decrypt(enc2)).toBe(plaintext);
    });

    it('encryptの返り値がbase64文字列であること', () => {
      const encrypted = service.encrypt('hello');

      // base64で使われる文字（A-Z, a-z, 0-9, +, /, =）のみで構成される
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);

      // base64としてデコードでき、iv(12) + authTag(16) = 最低28バイト以上
      const buf = Buffer.from(encrypted, 'base64');
      expect(buf.length).toBeGreaterThanOrEqual(12 + 16);
    });
  });

  //
  // 異常系
  //
  describe('異常系', () => {
    it('encryptが失敗するとTokenCipherErrorを投げること', () => {
      // 鍵長が不正(31バイト)だと createCipheriv が内部で例外を投げる。
      const broken = new CipherService();
      // onModuleInit を呼ばず、不正な長さの鍵を直接差し込む
      (broken as unknown as { key: Buffer }).key = Buffer.alloc(31);

      expect(() => broken.encrypt('x')).toThrow(TokenCipherError);
    });

    it('decryptが失敗するとTokenCipherErrorを投げること', () => {
      // 成立しない短い暗号文。 setAuthTagやdecipher.final() の段階で例外になる
      expect(() => service.decrypt('AAAA')).toThrow(TokenCipherError);
    });

    it('暗号文を改ざんするとTokenCipherErrorを投げること（改ざん検知）', () => {
      const plaintext = 'tamper-me';
      const encrypted = service.encrypt(plaintext);

      // バイト列に戻す
      const buf = Buffer.from(encrypted, 'base64');
      // レイアウト: [iv(12) | authTag(16) | ciphertext(...)]
      // → 28バイト目以降が暗号文。先頭バイトを1bit反転して改ざんする
      buf[28] ^= 0x01;

      // 改ざんしたbase64を作って復号 → 例外が出ることを確認
      const tampered = buf.toString('base64');
      expect(() => service.decrypt(tampered)).toThrow(TokenCipherError);
    });

    it('authTag部分を改ざんしてもTokenCipherErrorを投げること', () => {
      // 暗号文本体だけでなく、authTag自体が書き換わっても検知できる
      const plaintext = 'tamper-tag';
      const encrypted = service.encrypt(plaintext);

      const buf = Buffer.from(encrypted, 'base64');
      // レイアウト: [iv(12) | authTag(16) | ciphertext(...)]
      // 12〜27バイト目がauthTag。先頭(12バイト目)を反転した改ざん
      buf[12] ^= 0x01;

      const tampered = buf.toString('base64');
      expect(() => service.decrypt(tampered)).toThrow(TokenCipherError);
    });
  });
});
