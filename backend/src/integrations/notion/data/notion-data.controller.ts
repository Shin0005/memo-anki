import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { GetUserId } from '../../../common/decorators/get-userid.decorator';
import { NotionDataService } from './notion-data.service';
import { NotionDatabaseListResponse } from './dto/notion-database.response';
import { NotionColumnListResponse } from './dto/notion-column.response';
import { NotionImportRequest } from './dto/notion-import.request';
import { NotionImportResponse } from './dto/notion-import.response';
import { NotionApiExceptionFilter } from './notion-api.exception.filter';

/**
 * Notion連携データ取得エンドポイント
 * - DB一覧取得
 * - カラム一覧取得
 * - 全件Card変換
 * URLパラメータのidはdata_source_id
 */
@UseFilters(NotionApiExceptionFilter)
@Controller('/integrations/notion/databases')
export class NotionDataController {
  constructor(private readonly dataService: NotionDataService) {}

  /** データベース一覧取得 */
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiResponse({ status: 200, type: NotionDatabaseListResponse })
  async getDatabases(
    @GetUserId() userId: string,
  ): Promise<NotionDatabaseListResponse> {
    const databases = await this.dataService.getDatabases(userId);
    return new NotionDatabaseListResponse(databases);
  }

  /** 指定データベースのカラム一覧取得 */
  @UseGuards(JwtAuthGuard)
  @Get(':id/columns')
  @ApiParam({
    name: 'id',
    example: 'e9b3f1c2-...',
    description: 'Notion DB の ID（実体は data_source_id）',
  })
  @ApiResponse({ status: 200, type: NotionColumnListResponse })
  async getColumns(
    @GetUserId() userId: string,
    @Param('id') databaseId: string,
  ): Promise<NotionColumnListResponse> {
    const detail = await this.dataService.getDatabaseDetail(userId, databaseId);
    return new NotionColumnListResponse(detail);
  }

  /** 全件Card化してdeckに一括INSERT */
  @UseGuards(JwtAuthGuard)
  @Post(':id/import')
  @ApiParam({
    name: 'id',
    example: 'e9b3f1c2-...',
    description: 'Notion DB の ID（実体は data_source_id）',
  })
  @ApiResponse({ status: 201, type: NotionImportResponse })
  async importDatabase(
    @GetUserId() userId: string,
    @Param('id') databaseId: string,
    @Body() request: NotionImportRequest,
  ): Promise<NotionImportResponse> {
    const result = await this.dataService.importDatabase({
      userId,
      databaseId,
      deckId: request.deckId,
      columnName: request.columnName,
    });
    return new NotionImportResponse(result.count, result.truncated);
  }
}
