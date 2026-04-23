## 1. 試験実施方針

- **目的**: 実務クオリティを担保しつつ、リソースを最小化するため、ビジネスロジックの要となる「Service」の例外系・条件分岐と、I/Fの入り口である「Controller」のバリデーション・マッピングに絞って実施する。
- **範囲**: `CardService`, `CardController`
- **手法**: Vitest + Prisma Mock (`vitest-mock-extended` 等)

---

## 2. CardService 試験項目

| メソッド       | テストケース         | 確認事項 (Assertion)                                                                     | 優先理由         |
| :------------- | :------------------- | :--------------------------------------------------------------------------------------- | :--------------- |
| **createCard** | 正常系: NOTE作成     | `type: 0` の時、`question`/`answer` が `null` として Repo に渡されること                 | 仕様分岐の担保   |
|                | 正常系: QUIZ作成     | `type: 1` の時、`content` が `null` として Repo に渡されること                           | 仕様分岐の担保   |
|                | 異常系: 名前重複     | 同一ユーザー内で既存の `name` を指定した場合、`CardnameAlreadyExistException` が飛ぶこと | ビジネス制約     |
|                | 異常系: デッキ不在   | 指定した `deckId` が存在しない、または他人の場合、`DeckNotFoundException` が飛ぶこと     | 親リソース整合性 |
| **getCards**   | 正常系: 一覧取得     | `findCards` が実行され、正しい `userId` が渡されること                                   | データ分離       |
| **updateCard** | 正常系: 名前変更なし | `name` が未変更の場合、重複チェック (`findByCardname`) が呼ばれないこと                  | ロジック効率化   |
|                | 正常系: Type維持更新 | 既存の `type` (NOTE/QUIZ) に応じ、不要なフィールドが自動で `null` 清算されること         | データ整合性     |
|                | 異常系: カード不在   | 不正な `cardId`（または他人のID）に対し、`CardNotFoundException` が飛ぶこと              | 認可・整合性     |
|                | 異常系: 名前重複     | 変更後の `name` が既に他で使用されている場合、`AlreadyExistEx` が飛ぶこと                | 更新制約         |
| **deleteCard** | 正常系: 削除成功     | カードが存在する場合、正しい `cardId` で Repo の削除メソッドが呼ばれること               | 基本機能         |
|                | 異常系: 存在しないID | 削除対象がない場合、`CardNotFoundException` が飛ぶこと                                   | 異常系担保       |

---

## 3. ParseBigIntIdPipe 試験項目

| テストケース             | 確認事項 (Assertion)                                                      | 備考                |
| :----------------------- | :------------------------------------------------------------------------ | :------------------ |
| 正常系: 正常値通過       | 1〜19桁の数字文字列はそのまま返却されること                               | 境界値 (最小・最大) |
| バリデーション: 非数字   | アルファベット等の非数字文字列に対し `InvalidIdFormatException` が飛ぶこと | 型安全の担保        |
| バリデーション: 桁数超過 | 20桁以上の文字列に対し `InvalidIdFormatException` が飛ぶこと              | BigInt上限          |
| バリデーション: 空文字   | 空文字に対し `InvalidIdFormatException` が飛ぶこと                        | 空入力              |

---

## 4. CardController 試験項目

| メソッド       | テストケース           | 確認事項 (Assertion)                                                           | 備考                 |
| :------------- | :--------------------- | :----------------------------------------------------------------------------- | :------------------- |
| **共通**       | ガード確認             | `JwtAuthGuard` がクラスまたはメソッドに付与されていること                      | 認可                 |
| **createCard** | 正常系: 変換確認       | Requestの `deckId` (string) が `BigInt` に変換され Service へ渡されること      | 型変換               |
|                | バリデーション         | `type` に 0, 1 以外が指定された場合、400エラーとなること                       | 列挙型バリデーション |
|                | 正常系: レスポンス     | 戻り値が `CardResponse` でラップされ、Status 201 を返すこと                    | DTOマッピング        |
| **getCards**   | 正常系: 配列変換       | Service の戻り値（配列）が、個別に `CardResponse` インスタンス化されていること | マッピング           |
| **updateCard** | 正常系: 引数伝播       | パスパラメータ `cardId` と `UpdateCardRequest` の内容が Service へ渡されること | I/F整合性            |
| **deleteCard** | 正常系: 完了レスポンス | 成功時に Status 204 (No Content) を返すこと、`cardId`(Param) が Service へ渡されること | REST準拠             |
