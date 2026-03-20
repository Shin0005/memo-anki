import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  IsDefined,
  MinLength,
  ValidationOptions,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Javaの@NotBlankに相当するデコレータ
 *
 * string かつ !null かつ !undefined かつ !"" かつ !" "
 * @param message 表示したいメッセージ
 */
export function NotBlank(message?: string) {
  // 各デコレータ共通のoptionを定義
  const options: ValidationOptions = {
    message: message || '$property は入力が必須です',
  };

  return applyDecorators(
    IsDefined(options),
    IsString(options),

    // 値をトリミング " " → "" （戻り値unknownでlintをパス）
    Transform(({ value }): unknown =>
      typeof value === 'string' ? value.trim() : value,
    ),
    // 空文字（""）でないことを保証
    MinLength(1, options),
  );
}
