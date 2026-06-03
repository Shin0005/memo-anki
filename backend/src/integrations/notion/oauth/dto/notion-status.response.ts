import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * フロント側で「Notion連携」ボタンの表示出し分けに使用する
 */
export class NotionStatusResponse {
  @ApiProperty({ example: true, description: 'Notion連携済みかどうか' })
  connected: boolean;

  @ApiPropertyOptional({
    example: 'My Workspace',
    description: '連携先のNotionワークスペース名（connected=trueのみ）',
  })
  workspaceName?: string;

  constructor(connected: boolean, workspaceName?: string) {
    this.connected = connected;
    this.workspaceName = workspaceName;
  }
}
