import { PipeTransform, Injectable } from '@nestjs/common';
import { InvalidIdFormatException } from '../exceptions/application.exceptions';

// パスパラメータのBigInt ID (1〜19桁の数字文字列) を検証する
// バリデーション失敗時は InvalidIdFormatException (400) をスロー
@Injectable()
export class ParseBigIntIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // 先頭・末尾の空白は除去せずはじく
    // 1〜19桁の正整数のみ許可 (BigInt上限対策、先頭ゼロと0を排除)
    if (!/^[1-9]\d{0,18}$/.test(value)) {
      throw new InvalidIdFormatException(value);
    }
    return value;
  }
}
