import { InternalServerErrorException, Logger } from '@nestjs/common';

// notion連携完了後にenv使用箇所への例外処理の追加と起動前env確認を行う。
// issue#126に詳細記述
/**
 * 環境変数の取得（未設定なら500）
 * 起動前にenvチェックを行っているためenv書き忘れの確認になる
 */
export function getEnv(name: string): string {
  const logger = new Logger('getEnv');
  const value = process.env[name];
  if (!value) {
    logger.error(`環境変数 ${name} が設定されていません。`);
    throw new InternalServerErrorException(
      `環境変数 ${name} が設定されていません。`,
    );
  }
  return value;
}
