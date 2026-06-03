import { ApiProperty } from '@nestjs/swagger';
import type { NotionDatabaseDetail } from '../../mapper/notion.mapper';

/**
 * 必要部分だけ取り出したNotion DBのカラム情報
 */
export class NotionColumnItem {
  /** DBのカラム名 */
  @ApiProperty({ example: 'Body', description: 'カラム名' })
  name: string;

  /** Notionのプロパティ型 */
  @ApiProperty({
    example: 'rich_text',
    description: 'Notion プロパティ型 (title / rich_text / select 等)',
  })
  type: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }
}

/**
 * Notion DB のカラム一覧レスポンス
 *
 * フロントは type=='title'/'rich_text' のみフィルタしてユーザに見せる想定。
 */
export class NotionColumnListResponse {
  @ApiProperty({
    example: 'e9b3f1c2-...',
    description: 'Notion DB の ID',
  })
  databaseId: string;

  @ApiProperty({ example: 'Books', description: 'DB の表示名' })
  databaseTitle: string;

  @ApiProperty({ type: [NotionColumnItem], description: '全カラム' })
  columns: NotionColumnItem[];

  constructor(detail: NotionDatabaseDetail) {
    this.databaseId = detail.databaseId;
    this.databaseTitle = detail.databaseTitle;
    this.columns = detail.columns.map(
      (c) => new NotionColumnItem(c.name, c.type),
    );
  }
}
