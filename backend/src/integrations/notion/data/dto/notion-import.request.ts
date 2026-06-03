import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, Length } from 'class-validator';
import { NotBlank } from '../../../../common/decorators/not-blank.decorator';

/**
 * Notion DB のインポート実行 リクエスト body
 *
 *  - deckId : import 先 deck
 *  - columnName : Notion DBのどのカラム値をCardのcontentにするか
 */
export class NotionImportRequest {
  @ApiProperty({
    example: '1',
    description: 'bigint ID of the destination deck',
  })
  @NotBlank()
  @IsNumberString()
  @Length(1, 19)
  deckId: string;

  @ApiProperty({
    example: 'Body',
    maxLength: 200,
    description: 'Notion DB の本文として取り込むカラム名',
  })
  @NotBlank()
  @Length(1, 200)
  columnName: string;
}
