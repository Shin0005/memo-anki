import { Module } from '@nestjs/common';
import { CipherService } from './cipher.service';

/**
 * 暗号化サービスを提供するモジュール
 * keyを.envにから取得するためDIする必要がある。
 */
@Module({
  providers: [CipherService],
  exports: [CipherService],
})
export class EncryptionModule {}
