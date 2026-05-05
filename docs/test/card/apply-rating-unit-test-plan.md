# 復習採点ロジック 単体試験項目書 (Unit Test Plan)

## 1. 試験実施方針

- **目的**: 採点(rating)に応じた復習カードの状態遷移を、queue分岐(NEW/SHORT/LONG)とSM-2系数値計算の2層に分けて担保する。両層を独立して単体テストし、apply-rating側ではSM-2が正しく呼ばれることを「契約」として確認する。
- **範囲**: `applyRating`(純関数, `apply-rating.ts`), `adjustEaseFactor` / `calcInterval`(純関数, `sm2.ts`)
- **手法**: Vitest（依存なしの純関数テスト）。`now` を引数注入して時刻差を厳密に検証。

---

## 2. applyRating 試験項目（queue遷移）

採点(`rating`)に応じてカードの次状態を導出する純関数。SM-2系の数値計算は `sm2.ts` に分離しているため、このテストでは「queue遷移」「nextReviewAtの時刻差」「SM-2委譲時の挙動」を確認する。

| 現 queue | テストケース             | 確認事項 (Assertion)                                                                                                                | 備考                              |
| :------- | :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------- |
| **NEW**  | NEW × AGAIN              | queue が NEW のまま、`nextReviewAt = now + 1分`                                                                                     | 短時間再出題                      |
|          | NEW × HARD               | queue が NEW のまま、`nextReviewAt = now + 10分`                                                                                    | 短時間再出題                      |
|          | NEW × GOOD               | queue が SHORT へ昇格。`repetition = 0`(SHORT内で再カウント開始)、`nextReviewAt = now + 1時間`                                      | SHORT昇格の起点                   |
|          | NEW × EASY               | queue が LONG へ即昇格。`repetition = 1`, `interval = 1`, `nextReviewAt = now + 1日`                                                | SM-2 初期状態へ遷移               |
| **SHORT**| SHORT × AGAIN            | queue が SHORT のまま、`nextReviewAt = now + 1分`                                                                                   |                                   |
|          | SHORT × HARD             | queue が SHORT のまま、`nextReviewAt = now + 10分`                                                                                  |                                   |
|          | SHORT × GOOD (1回目)     | `repetition = 0 → 1`、queue は SHORT 継続、`nextReviewAt = now + 1時間`                                                             | 2回目で昇格する設計の前段         |
|          | SHORT × GOOD (2回目)     | `repetition = 1 → LONG昇格`。LONG初期化として `repetition = 1`, `interval = 1`, `nextReviewAt = now + 1日`                          | 2回good で LONG 昇格              |
|          | SHORT × EASY             | queue が LONG へ即昇格。`interval = 1`, `nextReviewAt = now + 1日`                                                                  |                                   |
| **LONG** | LONG × AGAIN             | queue が SHORT へ降格、`repetition = 0`、`easeFactor` が減少していること(`< 元の値`)、`nextReviewAt = now + 1分`                    | ease調整は `adjustEaseFactor` 委譲 |
|          | LONG × HARD (interval=1) | `interval = round(1 × 1.2) = 1` 維持で `nextReviewAt = now + 1日`、`easeFactor` 減少                                                | 1日待ち→+30分の不整合を回避       |
|          | LONG × HARD (interval>1) | `nextInterval = round(interval × 1.2)`、`nextReviewAt = now + nextInterval日`、`easeFactor` 減少                                    | Anki 流の hard 短縮               |
|          | LONG × GOOD (rep1→2)     | `repetition = 1 → 2` に伴い `calcInterval` 経由で `interval = 6日`                                                                  | SM-2 委譲（rep===2 で 6日）       |
|          | LONG × GOOD (rep≥2)      | `interval = round(prevInterval × easeFactor)`(例: `prev=6, ef=2.5 → 15日`)                                                          | SM-2 委譲（漸化式）               |
|          | LONG × EASY (interval=1) | rep=1→2 で `calcInterval(2, ...)=6日固定` × 1.3 = `8日`、`easeFactor` 増加                                                          | GOODと同じ rep=2 固定値起点       |
|          | LONG × EASY (rep≥2)      | `interval = round(SM-2標準値 × 1.3)`(easyボーナス)、`easeFactor` 増加                                                               | apply-rating 自前の easyボーナス  |

> **補足**: LONGケースの `easeFactor` の具体的な増減値（`-0.20` / `-0.15` / `+0.10`）と下限クランプは sm2 側でテストするため、ここでは「増減方向が正しい」ことのみ確認する（apply-rating が `adjustEaseFactor` に正しく委譲できているかの検証）。

---

## 3. SM-2 純関数 試験項目（`sm2.ts`）

apply-rating から呼び出される数値計算ロジック。queue遷移には関与せず、ease調整 と interval計算 を独立した純関数として持つ。

### 3.1 adjustEaseFactor

| テストケース       | 確認事項 (Assertion)                                                            | 備考                  |
| :----------------- | :------------------------------------------------------------------------------ | :-------------------- |
| AGAIN調整          | `easeFactor` が `-0.20` 減少すること（例: `2.5 → 2.3`）                         | SM-2 標準             |
| HARD調整           | `easeFactor` が `-0.15` 減少すること（例: `2.5 → 2.35`）                        | SM-2 標準             |
| GOOD据え置き       | `easeFactor` が変化しないこと                                                   | SM-2 標準             |
| EASY増加           | `easeFactor` が `+0.10` 増加すること（例: `2.5 → 2.6`）                         | SM-2 標準             |
| AGAIN下限          | `MIN_EASE_FACTOR(=1.3)` の状態で AGAIN を打っても `1.3` を下回らないこと        | 下限クランプ          |
| HARD下限           | `1.4 - 0.15 = 1.25` のように下限割れする計算でも `1.3` でクランプされること     | 下限クランプ          |

### 3.2 calcInterval

| テストケース           | 確認事項 (Assertion)                                                                    | 備考                              |
| :--------------------- | :-------------------------------------------------------------------------------------- | :-------------------------------- |
| rep=0 (境界)           | `1日` を返すこと（`rep<=1` 分岐の防御的境界）                                           | 通常運用では発生しない想定        |
| rep=1                  | `1日` を返すこと（SM-2 標準）                                                           |                                   |
| rep=2                  | `prevInterval` / `easeFactor` に依存せず固定で `6日` を返すこと                         | SM-2 標準: rep===2 で 6日         |
| rep>=3 通常            | `round(prevInterval × easeFactor)` を返すこと（例: `6 × 2.5 = 15`、`15 × 2.6 = 39`）    | SM-2 漸化式                       |
| 最小1日ガード          | 計算結果が `0` 以下になっても `1` を返すこと                                            | 防御的: 実運用ではef≥1.3で発生せず |
