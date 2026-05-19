## JWTの保存戦略（AT/RT分離）

## 背景

JWT認証において、ATとRTをどこに保存するべきか議論する必要があった。

## 結論

AccessTokenはメモリ、RefreshTokenはHttpOnlyCookieで管理する

## 理由

・HttpOnlyCookieによりRTをXSSから保護するため

・ATをAuthorizationヘッダで扱い、Cookie自動送信を避けることでCSRFリスクを低減するため

・フロント側で認証状態を即時判定可能にするため

## 他の案

・AT/RTともにCookieで管理

→ ブラウザが自動送信するためCSRFリスクが高まるため不採用

・AT/RTともにメモリまたはlocalStorageで管理

→ XSSによりトークンが窃取されるリスクが高いため不採用

## 影響

・XSSによる長期的な認証乗っ取りリスクが低減される

・CSRFリスクが構造的に抑制される

・ATの期限切れ時に再取得処理が必要になる

## 補足

ATはXSS耐性がないため、有効期限を短く（5〜15分程度）設定する
