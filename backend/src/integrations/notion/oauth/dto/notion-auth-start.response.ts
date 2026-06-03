import { ApiProperty } from '@nestjs/swagger';

/**
 * /auth レスポンス
 *
 * フロントはこの url を window.location.href にセットして Notion 認可画面へ遷移する。
 */
export class NotionAuthStartResponse {
  @ApiProperty({
    example:
      'https://api.notion.com/v1/oauth/authorize?client_id=...&response_type=code&owner=user&redirect_uri=...&state=...',
    description: 'Notion認可画面のURL。フロントはこのURLへブラウザ遷移する。',
  })
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
