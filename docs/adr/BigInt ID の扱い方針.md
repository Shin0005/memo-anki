## BigInt ID の扱い方針

## 背景

CardId, DeckIdにBigIntを設定している。HTTP/JSONではbigintは扱えないのでどこでstringに変換するか議論する必要があった。現状はDB との境界で bigint へ変換しているが、本来はHTTP/JSONからTSに変換する際にbigint化するのが自然である。

## 結論

既存の実装に合わせて、DB との境界（Prisma 直前）で bigint へ変換し、それ以外（フロント、バックエンドの controller / service / DTO、HTTP / JSON）では string として扱う。

## 理由

- HTTP / JSON では bigint をそのまま載せられない
- サーバ内部を bigint に揃えることに型表現以外のメリットが薄い一方、BigInt変換用のInterceptorの追加・テスト一斉書き換え・DTO 整合修正のコストが大きい。
- 現行のテストが string 前提で安定して通っており、運用上の不具合も発生していない。

## 他の案

- サーバ内部を bigint で統一する案
  → 理由に記載の通り、変更コストに対してリターンが薄い

## 影響

- shared の OpenAPI 由来の型は string で生成される。フロントは string のまま扱う

## 補足

- 数値ソートが必要な場合はフロント側でBigInt(a) のように変換する。ID は識別子であり演算対象ではないためstring運用の問題は少ない。
- service 層内で一部のメソッドが bigint 受取・他は string 受取という型混在が残っている。本方針に沿って string 受取で統一するリファクタを別途行う。
  →解決済み
