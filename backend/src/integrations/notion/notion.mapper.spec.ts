import { describe, it, expect, beforeEach } from 'vitest';
import type {
  DataSourceObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { NotionMapper } from './notion.mapper';
import { NotionUnsupportedColumnException } from './notion.exceptions';

/** テスト用ヘルパ */

/** RichTextItemResponse を最小限の plain_text だけで作る */
const rt = (text: string): RichTextItemResponse =>
  ({ plain_text: text }) as RichTextItemResponse;

/**
 * DataSourceObjectResponse をテスト用に作る。
 * mapper は型ガードを通さず id / title / properties しか読まないため、
 * その3項目だけ埋めて残りは cast で省略する。
 */
const buildDataSource = (
  overrides: Partial<DataSourceObjectResponse>,
): DataSourceObjectResponse =>
  ({
    id: 'ds-1',
    title: [],
    properties: {},
    ...overrides,
  }) as DataSourceObjectResponse;

/**
 * PageObjectResponse をテスト用に作る。
 * mapper は id / properties しか読まないため、その2項目だけ埋める。
 * properties は呼び出し側で具体的な型を入れたいので Record<string, unknown> を受ける。
 */
const buildPage = (
  id: string,
  properties: Record<string, unknown>,
): PageObjectResponse =>
  ({
    id,
    properties,
  }) as PageObjectResponse;

/** NotionMapper */
describe('NotionMapper', () => {
  let mapper: NotionMapper;

  beforeEach(() => {
    mapper = new NotionMapper();
  });

  /** toDatabases */
  describe('toDatabases', () => {
    it('正常系: title を plain_text 連結する', () => {
      const ds = buildDataSource({
        id: 'ds-1',
        title: [rt('Hello'), rt(' '), rt('World')],
      });

      const result = mapper.toDatabases([ds]);

      expect(result).toEqual([{ id: 'ds-1', title: 'Hello World' }]);
    });

    it('正常系: 空 title は空文字になる', () => {
      const ds = buildDataSource({ id: 'ds-4', title: [] });
      expect(mapper.toDatabases([ds])[0].title).toBe('');
    });
  });

  /** toDatabaseDetail */
  describe('toDatabaseDetail', () => {
    it('正常系: properties マップをカラム配列に変換する', () => {
      const ds = buildDataSource({
        id: 'ds-1',
        title: [rt('Books')],
        // propertiesは型が巨大な union のため、テストでは as never で無理やり代入
        properties: {
          Name: { id: 'a', name: 'Name', type: 'title' },
          Body: { id: 'b', name: 'Body', type: 'rich_text' },
          Done: { id: 'c', name: 'Done', type: 'checkbox' },
        } as never,
      });

      const result = mapper.toDatabaseDetail(ds);

      expect(result.databaseId).toBe('ds-1');
      expect(result.databaseTitle).toBe('Books');
      // 順序は JSON のキー順なので順序検証は控えめにする
      expect(result.columns).toEqual(
        expect.arrayContaining([
          { name: 'Name', type: 'title' },
          { name: 'Body', type: 'rich_text' },
          { name: 'Done', type: 'checkbox' },
        ]),
      );
      expect(result.columns).toHaveLength(3);
    });

    it('正常系: properties が空でも空配列を返す', () => {
      const ds = buildDataSource({ id: 'ds-empty', properties: {} });
      const result = mapper.toDatabaseDetail(ds);
      expect(result.columns).toEqual([]);
    });
  });

  /** toNotes */
  describe('toNotes', () => {
    it('正常系: title 型プロパティを name に、columnName を content に変換', () => {
      const pages = [
        buildPage('p1', {
          Name: { id: 't', type: 'title', title: [rt('Title1')] },
          Body: { id: 'b', type: 'rich_text', rich_text: [rt('Body1')] },
        }),
        buildPage('p2', {
          Name: { id: 't', type: 'title', title: [rt('Title2')] },
          Body: { id: 'b', type: 'rich_text', rich_text: [rt('Body2')] },
        }),
      ];

      const result = mapper.toNotes(pages, 'Body');

      expect(result).toEqual([
        { name: 'Title1', content: 'Body1' },
        { name: 'Title2', content: 'Body2' },
      ]);
    });

    it('正常系: title 型を本文として指定したら title 値が content に入る', () => {
      const pages = [
        buildPage('p1', {
          Name: { id: 't', type: 'title', title: [rt('Both')] },
        }),
      ];

      const result = mapper.toNotes(pages, 'Name');

      expect(result).toEqual([{ name: 'Both', content: 'Both' }]);
    });

    it('正常系: 指定カラムが存在しない page は content=空文字', () => {
      const pages = [
        buildPage('p1', {
          Name: { id: 't', type: 'title', title: [rt('OnlyTitle')] },
        }),
      ];

      const result = mapper.toNotes(pages, 'MissingColumn');

      expect(result).toEqual([{ name: 'OnlyTitle', content: '' }]);
    });

    it('異常系: 未対応型 (例: checkbox) は NotionUnsupportedColumnException を投げる', () => {
      // title / rich_text 以外のカラムを選んだ場合、mapper は文字列化できないため
      // Notion 用の独自例外を投げてフロントに「対応外」を伝える
      const pages = [
        buildPage('p1', {
          Name: { id: 't', type: 'title', title: [rt('T')] },
          Done: { id: 'c', type: 'checkbox', checkbox: true },
        }),
      ];

      expect(() => mapper.toNotes(pages, 'Done')).toThrow(
        NotionUnsupportedColumnException,
      );
    });

    it('正常系: title 型プロパティが無い page は name=空文字', () => {
      // 実運用では起きないが、partial や破損データへの保険
      const pages = [
        buildPage('p1', {
          Body: { id: 'b', type: 'rich_text', rich_text: [rt('OnlyBody')] },
        }),
      ];

      const result = mapper.toNotes(pages, 'Body');

      expect(result).toEqual([{ name: '', content: 'OnlyBody' }]);
    });

    it('正常系: スタイル分割された rich_text を結合する', () => {
      const pages = [
        buildPage('p1', {
          Name: { id: 't', type: 'title', title: [rt('Hello, ')] },
          Body: {
            id: 'b',
            type: 'rich_text',
            // 太字部分とリンク部分でセグメント分割されたパターン
            rich_text: [rt('start '), rt('middle'), rt(' end')],
          },
        }),
      ];

      const result = mapper.toNotes(pages, 'Body');

      expect(result[0].content).toBe('start middle end');
    });
  });
});
