import { Inject, Injectable } from '@nestjs/common';
import { NotionApiClient } from './notion-api.client';
import {
  NotionDatabaseDetail,
  NotionDatabaseSummary,
  NotionMapper,
} from '../mapper/notion.mapper';
import { ICardRepository } from '../../../card/card.repository.interface';

/**
 * Notion 連携データ取得サービス
 */
@Injectable()
export class NotionDataService {
  constructor(
    private readonly apiClient: NotionApiClient,
    private readonly mapper: NotionMapper,
    // CardService と揃えて token 経由で注入
    @Inject('ICardRepository')
    private readonly cardRepository: ICardRepository,
  ) {}

  /** データベース一覧を返す */
  async getDatabases(userId: string): Promise<NotionDatabaseSummary[]> {
    const results = await this.apiClient.searchDatabases(userId);
    return this.mapper.toDatabases(results);
  }

  /** 指定DBのカラム一覧を返す */
  async getDatabaseDetail(
    userId: string,
    databaseId: string,
  ): Promise<NotionDatabaseDetail> {
    const database = await this.apiClient.retrieveDatabase(userId, databaseId);
    return this.mapper.toDatabaseDetail(database);
  }

  /**
   * 全件Card化してdeckに一括INSERT
   * @returns 作成数と truncated フラグ（1000件で打ち切った場合 true）
   */
  async importDatabase(input: {
    userId: string;
    databaseId: string;
    deckId: string;
    columnName: string;
  }): Promise<{ count: number; truncated: boolean }> {
    // Notion から全 page を取得
    const { pages, truncated } = await this.apiClient.queryDatabaseAll(
      input.userId,
      input.databaseId,
    );

    // pageをCardDtoへ変換
    const notes = this.mapper.toNotes(pages, input.columnName);

    // 認可チェック + 一括INSERTはrepository に任せる
    const count = await this.cardRepository.createManyNote({
      userId: input.userId,
      deckId: BigInt(input.deckId),
      rawNotes: notes,
    });

    return { count, truncated };
  }
}
