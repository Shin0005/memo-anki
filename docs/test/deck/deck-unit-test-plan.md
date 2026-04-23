# Deck機能 単体試験項目書 (Unit Test Plan)

## 1. 試験実施方針

- [cite_start]**目的**: 品質を担保しつつ、リソースを最小化するため、ビジネスロジックの要となる「Service」の例外系と、I/Fの入り口である「Controller」の最低限のバリデーション・マッピングに絞って実施する 。
- **範囲**: `DeckService`, `DeckController`
- **手法**: Vitest + Prisma Mock (`jest-mock-extended`)

---

## 2. DeckService 試験項目

| メソッド        | テストケース         | 確認事項 (Assertion)                                                                                | 優先理由                    |
| :-------------- | :------------------- | :-------------------------------------------------------------------------------------------------- | :-------------------------- |
| **createDeck**  | 正常系: 新規作成     | [cite_start]Prismaの`create`が`DeckUncheckedCreateInput`形式の正しい引数で呼ばれること              | 基本機能の担保              |
|                 | 異常系: 名前重複     | [cite_start]同一ユーザー内で既存の`name`を指定した場合、`DecknameAlreadyExistException`が飛ぶこと   | ビジネス制約の遵守          |
| **getDecks**    | 正常系: 一覧取得     | [cite_start]`findMany`が実行され、`userId`によるフィルタリングが正しく行われること                  | データ分離の確認            |
| **getDeckById** | 正常系: 取得成功     | 指定した`deckId`で`findUniqueOrThrow`が呼ばれ、データが返ること                                     | 未記載メソッドの補完        |
|                 | 異常系: 未検出       | データが存在しない場合に例外がスローされること                                                      | 安全性の確認                |
| **updateDeck**  | 正常系: 名前変更なし | [cite_start]`name`が未変更の場合、重複チェック(`findByDeckName`)が呼ばれないこと                    | パフォーマンス/ロジック分岐 |
|                 | 正常系: 名前変更あり | [cite_start]`name`変更時、重複チェックが走り、問題なければ`updateMany`が呼ばれること                | ロジック網羅                |
|                 | 正常系: 更新後データ | 更新実行後に`findByDeckId`が呼ばれ、最新のデータが返却されること                                    | 戻り値の正確性              |
|                 | 異常系: 存在しないID | [cite_start]最初の存在確認で不正な`deckId`（他人のID含む）に対し、`DeckNotFoundException`が飛ぶこと | 認可・整合性                |
|                 | 異常系: 更新失敗     | `updateMany`の戻り値`count`が0の場合、`DeckNotFoundException`が飛ぶこと                             | 整合性チェックの網羅        |
|                 | 異常系: 名前重複     | [cite_start]変更後の`name`が既に他で使用されている場合、`AlreadyExistEx`が飛ぶこと                  | 更新制約                    |
| **deleteDeck**  | 正常系: 削除成功     | [cite_start]正しい`deckId`で`deleteMany`が呼ばれること                                              | 基本機能の担保              |
|                 | 異常系: 存在しないID | [cite_start]`findByDeckId`による事前チェックで対象がない場合、`DeckNotFoundException`が飛ぶこと     | 異常系の担保                |

---

## 3. DeckController 試験項目

| メソッド       | テストケース           | 確認事項 (Assertion)                                                          | 備考                 |
| :------------- | :--------------------- | :---------------------------------------------------------------------------- | :------------------- |
| **共通**       | ガード確認             | [cite_start]`JwtAuthGuard`がクラスに付与されていること                        | 認可の入り口         |
| **createDeck** | 正常系: 変換確認       | [cite_start]Serviceの戻り値が`DeckResponse`でラップされ、Status 201を返すこと | DTOマッピング確認    |
|                | バリデーション         | [cite_start]`name`が空文字(`NotBlank`)の場合、400エラーがトリガーされること   | 代表例のみ確認       |
| **getDecks**   | 正常系: 引数伝播       | [cite_start]デコレータから取得した`userId`が正しくServiceへ渡されること       | 繋ぎ込み確認         |
|                | 正常系: マッピング     | 取得した配列の全要素が`DeckResponse`のインスタンスであること                  | 複数データ変換の確認 |
| **updateDeck** | バリデーション         | [cite_start]`name`が空文字(`NotBlank`)の場合、400エラーがトリガーされること   | 代表例のみ確認       |
|                | 正常系: 引数伝播       | [cite_start]`userId`, `deckId`(Param), `UpdateDeckRequest`の内容がServiceへ渡されること | I/F整合性            |
| **deleteDeck** | 正常系: 完了レスポンス | [cite_start]成功時にStatus 204 (No Content) を返すこと、`deckId`(Param)がServiceへ渡されること | REST準拠確認         |
