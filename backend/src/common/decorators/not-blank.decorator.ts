import { applyDecorators } from '@nestjs/common';
import { IsString, IsDefined, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Javaの@NotBlankと@Trim()を合わせたようなデコレータ
 *
 * string かつ !null かつ !undefined かつ !"" かつ !" "
 * @param message 表示したいメッセージ
 * @return Trimされた値
 */
export function NotBlank(message?: string) {
  return applyDecorators(
    IsDefined({ message: message || '$property は必須です' }),
    IsString({ message: message || '$property には文字列を入力してください' }),

    // 値をトリミング " " → "" （戻り値unknownでlintをパス）
    Transform(({ value }): unknown =>
      typeof value === 'string' ? value.trim() : value,
    ),
    // 空文字（""）でないことを保証
    MinLength(1, { message: message || '$property を入力してください' }),
  );
}
