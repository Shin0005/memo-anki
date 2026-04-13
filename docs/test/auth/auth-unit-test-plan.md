# Auth機能 単体試験項目書 (Unit Test Plan)

## 1. 試験実施方針

- **目的**: 認証・トークン発行・リフレッシュ処理を担う `AuthService` のビジネスロジックを検証し、不正アクセス防止とデータ整合性を担保する
- **範囲**: `AuthService`, `AuthController`
- **手法**: Vitest + Mock（UserService, JwtService, bcrypt）

---

## 2. AuthService 試験項目

### ■ register

| テストケース          | 確認事項 (Assertion)                                                                               | 優先理由   |
| :-------------------- | :------------------------------------------------------------------------------------------------- | :--------- |
| 正常系: 新規登録      | `userService.create` が呼ばれ、`generateTokens` が呼ばれ、`{ username, email, tokens }` が返ること | 基本機能   |
| 異常系: username重複  | `UsernameAlreadyExistException` が発生すること                                                     | 一意性制約 |
| 異常系: email重複     | `UserEmailAlreadyExistException` が発生すること                                                    | 一意性制約 |
| 条件分岐: email未指定 | `validEmail` が呼ばれないこと                                                                      | 分岐網羅   |
| 副作用: create未実行  | 異常時に `userService.create` が呼ばれないこと                                                     | 不正防止   |

---

### ■ login

| テストケース             | 確認事項 (Assertion)                                                                         | 優先理由         |
| :----------------------- | :------------------------------------------------------------------------------------------- | :--------------- |
| 正常系: 認証成功         | `bcrypt.compare` がtrue、`generateTokens` が呼ばれ、`{ username, email, tokens }` が返ること | 認証機能         |
| 異常系: ユーザー不在     | `LoginFailedException('Username')` が発生すること                                            | 認証失敗制御     |
| 異常系: パスワード不一致 | `LoginFailedException('Password')` が発生すること                                            | 不正アクセス防止 |
| 副作用: token生成        | `generateTokens` が呼ばれること                                                              | フロー確認       |

---

### ■ generateTokens

| テストケース         | 確認事項 (Assertion)                       | 優先理由     |
| :------------------- | :----------------------------------------- | :----------- |
| 正常系: トークン生成 | `jwtService.sign` が2回呼ばれること        | 仕様保証     |
| ペイロード確認       | `{ sub: userId }` が渡されること           | 契約保証     |
| 副作用: RT保存       | `updateRefreshToken` が呼ばれること        | セキュリティ |
| 戻り値               | `{ accessToken, refreshToken }` が返ること | I/F保証      |

---

### ■ updateRefreshToken

| テストケース       | 確認事項 (Assertion)                            | 優先理由     |
| :----------------- | :---------------------------------------------- | :----------- |
| 正常系: ハッシュ化 | `bcrypt.hash` が呼ばれること                    | セキュリティ |
| 副作用: DB更新     | `userService.updateRefreshToken` が呼ばれること | データ整合性 |
| データ内容         | hashとexpiresAtが渡されること                   | 契約保証     |

---

### ■ refresh

| テストケース             | 確認事項 (Assertion)                             | 優先理由     |
| :----------------------- | :----------------------------------------------- | :----------- |
| 正常系: リフレッシュ成功 | `generateTokens` が呼ばれ、新しいtokenが返ること | 基本機能     |
| 異常系: トークン不正     | `verifyAsync` 失敗で `UnauthorizedException`     | セキュリティ |
| 異常系: payload不正      | `sub` が無い場合に例外                           | データ検証   |
| 異常系: user不在         | `UnauthorizedException` が発生                   | 整合性       |
| 異常系: RT未設定         | `UnauthorizedException` が発生                   | セキュリティ |
| 異常系: RT不一致         | `bcrypt.compare` falseで例外                     | 不正利用防止 |

---

# 以下廃止　結合試験に含める

## 3. AuthController 試験項目

| メソッド     | テストケース           | 確認事項 (Assertion)                                               | 優先理由     |
| :----------- | :--------------------- | :----------------------------------------------------------------- | :----------- |
| **register** | 正常系: レスポンス     | `{ username, accessToken, email }` が返ること                      | I/F整合性    |
|              | Service呼び出し        | `authService.register` が呼ばれること                              | フロー確認   |
|              | Cookie設定（最低限）   | `refresh_token` が設定され、`httpOnly: true` が含まれること        | セキュリティ |
| **login**    | 正常系: レスポンス     | `{ username, accessToken, email }` が返ること                      | I/F整合性    |
|              | Service呼び出し        | `authService.login` が呼ばれること                                 | フロー確認   |
|              | Cookie設定（最低限）   | `refresh_token` が設定され、`httpOnly: true` が含まれること        | セキュリティ |
| **refresh**  | 正常系: トークン再発行 | `{ accessToken }` が返ること                                       | 基本機能     |
|              | Service呼び出し        | `authService.refresh` が呼ばれること                               | フロー確認   |
|              | Cookie更新（最低限）   | 新しい `refresh_token` が設定され、`httpOnly: true` が含まれること | セキュリティ |
|              | 異常系: Cookieなし     | `UnauthorizedException` が発生すること                             | 認可制御     |
| **cookie**   | httpOnly               | `httpOnly: true` が設定されること                                  | XSS対策      |
|              | sameSite               | `'lax'` が設定されること                                           | CSRF対策     |

---

## 4. Guard / Strategy 試験項目（共通）

| クラス       | テストケース | 確認事項 (Assertion)               | 備考     |
| :----------- | :----------- | :--------------------------------- | :------- |
| JwtStrategy  | validate     | `sub` が userId として扱われること | 認可情報 |
| JwtAuthGuard | 動作確認     | Guardが適用されること              | 認可処理 |
