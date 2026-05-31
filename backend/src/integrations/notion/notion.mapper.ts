import { Injectable, Logger } from '@nestjs/common';
import type {
  DataSourceObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import type { CreateCardDto } from '../../card/card.service';
import { NotionUnsupportedColumnException } from './notion.exceptions';

/**
 * フロントの DB 選択リストで使う最小情報
 * databaseIdと呼ばれているIDは実体としてはdata_source_id
 */
export type NotionDatabaseSummary = {
  id: string;
  title: string;
};

/**
 * 必要なDBカラム情報
 *
 * 現状はフロント側でtypeの絞り込みを行うが、Notionのアップデート遅れで
 * 古いUIから送られてくる場合や、フロントのフィルタ漏れを考慮してバックでも行う。
 */
export type NotionColumnInfo = {
  name: string; // タイトルにあたる
  type: string; // notion側のカラム。'rich_text'か'title'に後で絞り込む
};

/** database 詳細（カラム一覧含む） */
export type NotionDatabaseDetail = {
  databaseId: string;
  databaseTitle: string;
  columns: NotionColumnInfo[];
};

/**
 * Notion pageから抽出した、Card 作成に必要な部分のみの型
 *
 * Card service の入力 DTO (`CreateCardDto`) のうち、
 * Notion から取れるフィールド (name / content) だけを取り出し
 */
export type NotionExtractedPage = Pick<CreateCardDto, 'name' | 'content'>;

/**
 * Notion SDKの各生DTO → CardDTO への変換
 * card側はnotionを一切知らない
 */
@Injectable()
export class NotionMapper {
  private readonly logger = new Logger(NotionMapper.name);

  /** rich_text / title の配列を plain_text 連結文字列に変換する */
  private joinPlainText(items: RichTextItemResponse[] | undefined): string {
    if (!items || items.length === 0) return '';
    // Notion はスタイルごとに配列を分割して返すため、表示用に連結する。
    return items.map((i) => i.plain_text).join('');
  }

  /** data_source配列をCardDTO に変換する */
  toDatabases(
    dataSources: DataSourceObjectResponse[],
  ): NotionDatabaseSummary[] {
    return dataSources.map((ds) => ({
      id: ds.id,
      title: this.joinPlainText(ds.title), // rich_text を結合
    }));
  }

  /**
   * data_sourceの詳細カラムレスポンスをCardDTOに変換する
   *
   * properties は { [カラム名]: { id, name, type, ... } } のマップで返るが、
   * JSON のキー順は保証されないため、value.name を使って配列化する。
   * フロント側で type=="title"/"rich_text" の絞り込みを行う想定。
   */
  toDatabaseDetail(database: DataSourceObjectResponse): NotionDatabaseDetail {
    const columns = Object.values(database.properties).map((p) => ({
      name: p.name,
      type: p.type,
    }));

    return {
      databaseId: database.id,
      databaseTitle: this.joinPlainText(database.title),
      columns,
    };
  }

  /**
   * page配列を指定カラム名で。NotionExtractedPageに変換する
   *
   * タイトルと内容を特定後に変換をかける。
   * 返却値はそのままCreateCardDtoには流せない（deckId/userId/type
   * が不足）ため、service側で残りのフィールドを合成すること。
   */
  toNotes(
    pages: PageObjectResponse[],
    columnName: string,
  ): NotionExtractedPage[] {
    return pages.map((page) => {
      // title型プロパティを探す（typeで特定）
      const titleProp = Object.values(page.properties).find(
        (p) => p.type === 'title',
      );
      const name =
        titleProp && titleProp.type === 'title'
          ? this.joinPlainText(titleProp.title)
          : '';

      // 内容をユーザが指定したプロパティ名で取り出す
      const target = page.properties[columnName];
      const content = this.propertyToString(target, columnName, page.id);

      return { name, content };
    });
  }

  /** プロパティ値を文字列化するヘルパ */
  private propertyToString(
    prop: PageObjectResponse['properties'][string] | undefined,
    columnName: string,
    pageId: string,
  ): string {
    // DBのカラムがpageに無いケース（後から削除された等）
    if (!prop) {
      this.logger.warn(
        `page ${pageId} に columnName=${columnName} のプロパティが見つかりません。`,
      );
      return '';
    }
    if (prop.type === 'title') {
      return this.joinPlainText(prop.title);
    }
    if (prop.type === 'rich_text') {
      return this.joinPlainText(prop.rich_text);
    }
    // 対応しているのは title / rich_text のみ。それ以外（checkbox / select / date 等）は
    // 文字列化できないため、ここでフロントに「対応外」を伝える。
    this.logger.warn(
      `page ${pageId} の columnName=${columnName} は type=${prop.type} のため対応外です。`,
    );
    throw new NotionUnsupportedColumnException(columnName, prop.type);
  }
}
