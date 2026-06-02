import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Notion DB インポート完了レスポンス
 *
 *  - count     : 作成されたカード数
 *  - truncated : Notion 側 1000 件上限で打ち切ったならTrue
 */
export class NotionImportResponse {
  @ApiProperty({ example: 123, description: '作成されたカード数' })
  count: number;

  @ApiPropertyOptional({
    example: false,
    description: 'true なら 1000 件上限で打ち切ったことを示す',
  })
  truncated?: boolean;

  constructor(count: number, truncated: boolean) {
    this.count = count;
    // false のときは省略
    this.truncated = truncated || undefined;
  }
}
