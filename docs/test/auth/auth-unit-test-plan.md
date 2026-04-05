# Auth機能 単体試験項目書 (Unit Test Plan)

## 1. 試験実施方針

- **目的**: 認証・認可の根幹となる `AuthService` のビジネスロジックを網羅し、不正なアクセスや重複登録を防ぐバリデーション・例外処理の正当性を担保する。
- **範囲**: `AuthService`, `AuthController`
- **手法**: Vitest + Prisma Mock (`vitest-mock-extended` 等)

---

## 2. AuthService 試験項目

| メソッド     | テストケース             | 確認事項 (Assertion)                                                                                    | 優先理由           |
| :----------- | :----------------------- | :------------------------------------------------------------------------------------------------------ | :----------------- |
| **register** | 正常系: 新規登録         | `userService.create` が呼ばれ、`jwtService.sign` によるトークンを含む `AuthResponse` が返ること         | 基本機能の担保     |
|              | 異常系: username重複     | `userService.findByUsername` で既存ユーザーが検出された場合、`UsernameAlreadyExistException` が飛ぶこと | 一意性制約の遵守   |
|              | 異常系: email重複        | `email` が入力され、かつ既に存在する場合、`UserEmailAlreadyExistException` が飛ぶこと                   | ビジネス制約の遵守 |
|              | ロジック: パスワード保護 | `userService.create` に渡されるパスワードが、元の平文と一致しない（ハッシュ化の示唆）こと               | セキュリティ要件   |
| **login**    | 正常系: 認証成功         | `bcrypt.compare` が真を返し、正しいペイロード（sub: id）で `jwtService.sign` が呼ばれること             | 認証機能の核心     |
|              | 異常系: ユーザー不在     | `findByUsername` の結果が null の場合、`LoginFailedException('Username')` が飛ぶこと                    | 認証失敗の制御     |
|              | 異常系: パスワード不一致 | `bcrypt.compare` が偽を返す場合、`LoginFailedException('Password')` が飛ぶこと                          | 不正アクセスの遮断 |

---

## 3. AuthController 試験項目

| メソッド     | テストケース       | 確認事項 (Assertion)                                                                                                      | 備考          |
| :----------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------ | :------------ |
| **register** | 正常系: レスポンス | [cite_start]Serviceの戻り値が `AuthResponse` として正しく返却されること [cite: 2]                                         | I/F整合性     |
|              | バリデーション     | [cite_start]`RegisterRequest` の `username` が空、または `password` が規定文字数未満の場合、400エラーが返ること [cite: 1] | 入力値検証    |
| **login**    | 正常系: レスポンス | [cite_start]認証成功時、`AuthResponse`（username, accessToken, email）が返却されること [cite: 2]                          | DTOマッピング |
|              | バリデーション     | [cite_start]`LoginRequest` の必須項目が欠落している場合、400エラーが返ること [cite: 1]                                    | 入力値検証    |

---

## 4. Guard / Strategy 試験項目（共通）

| クラス           | テストケース     | 確認事項 (Assertion)                                                      | 備考               |
| :--------------- | :--------------- | :------------------------------------------------------------------------ | :----------------- |
| **JwtStrategy**  | 正常系: validate | ペイロードの `sub` がオブジェクトの `id` として正しくマッピングされること | 認可情報の抽出     |
| **JwtAuthGuard** | 正常系: 動作確認 | `AuthGuard('jwt')` を継承し、正しくインスタンス化されていること           | 認可プロセスの起点 |
