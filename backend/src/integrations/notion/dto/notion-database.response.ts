import { ApiProperty } from '@nestjs/swagger';
import type { NotionDatabaseSummary } from '../notion.mapper';

/**
 * Notion連携で選択されたdatabaseを1件返却
 */
export class NotionDatabaseItem {
  /** データソースID */
  @ApiProperty({
    example: 'e9b3f1c2-...-...',
    description: 'Notion DB の ID',
  })
  id: string;

  /** DBの名前 */
  @ApiProperty({ example: 'Books', description: 'DB の表示名' })
  title: string;

  constructor(item: NotionDatabaseSummary) {
    this.id = item.id;
    this.title = item.title;
  }
}

/**
 * Notion DB 一覧のレスポンス
 */
export class NotionDatabaseListResponse {
  @ApiProperty({
    type: [NotionDatabaseItem],
    description: 'user が Notion 側で share した database 一覧',
  })
  databases: NotionDatabaseItem[];

  constructor(items: NotionDatabaseSummary[]) {
    this.databases = items.map((item) => new NotionDatabaseItem(item));
  }
}
