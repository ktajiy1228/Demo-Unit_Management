# 仕様変更書：新規予約での複数デモ機選択（主／子デモ機構成）

- 作成日: 2026-08-28
- 対象アプリ: 照明器具デモ機 運用管理アプリ
- ステータス: 実装済み（branch `feature/multi-unit-reservation`）。DBマイグレーション適用・テスト実行は未
- 種別: 機能追加（既存フローへの仕様追加）

---

## 1. 概要

新規予約時に、1案件で最大3台（**主デモ機1台＋子デモ機0〜2台**）を同時に押さえられるようにする。

期間・送付先・出荷関連の情報、および出庫／返却の操作はすべて**案件単位で1つ**とする。デモ機ごとに分割しない。子デモ機のみ個別キャンセルが可能で、主デモ機を外す場合は案件全体のキャンセルとなる。

## 2. 背景・目的

現状は「予約1件 = デモ機1台」に固定されている。実運用では同一顧客・同一期間に複数台を貸し出すケースがあり、その都度別々の予約を登録している。1案件としてまとめて登録・管理できるようにして入力の手間と管理の煩雑さを減らす。

## 3. 用語定義

| 用語 | 定義 |
|---|---|
| 案件（予約） | `Reservation` 1レコード。顧客・期間・送付先・出荷情報を保持する単位 |
| 主デモ機 | 案件に必ず1台紐づくデモ機。`Reservation.demoUnitId`（現行カラムを流用）。個別キャンセル不可 |
| 子デモ機 | 案件に追加で紐づくデモ機。0〜2台。`ReservationUnit` レコード。個別キャンセル可 |
| アクティブな子 | `ReservationUnit.status = "ACTIVE"` の子デモ機。キャンセル済みの子は集計・表示から除外 |

## 4. 現行仕様との差分サマリ

| 項目 | 現行 | 変更後 |
|---|---|---|
| 1案件のデモ機台数 | 1台固定 | 主1台＋子0〜2台（最大3台） |
| デモ機の選択UI | ラジオ（単一） | 主＝ラジオ、子＝チェックボックス |
| 期間・送付先・出荷情報 | 案件で1つ | 変更なし（案件で1つ） |
| 出庫・返却 | 案件単位 | 変更なし（案件単位・一括／一部不可） |
| 予約のキャンセル | `RETURNED` / `CANCELLED` 以外なら可（貸出中でも可） | **`CONFIRMED` のときのみ可**（出荷後＝`PICKED_UP` 以降は不可）。単一台予約にも適用 |
| 子デモ機の個別キャンセル | 概念なし | `CONFIRMED` のときのみ可 |
| 一覧・詳細のデモ機表示 | デモ機名 | `主デモ機名 + 他○件`（○＝アクティブな子の件数、0件なら付記なし） |
| データモデル | `Reservation.demoUnitId` のみ | 上記に加え `ReservationUnit` テーブルを追加（**追加のみ・既存データ移行なし**） |

## 5. 機能仕様

### 5.1 予約登録

- 主デモ機を**1台必須**で明示選択する。
- 子デモ機を**0〜2台**選択できる。
- 主デモ機に選択済みのデモ機は子デモ機として選択できない。
- 子デモ機に同一デモ機を重複選択できない。
- 主デモ機・子デモ機の**配置拠点（`homeLocationId`）はすべて同一**でなければならない。混在した場合は登録を拒否する。
- 期間・出荷予定日・送付先・発送拠点・返却拠点・担当営業・顧客情報・備考は案件で1つ（現行どおり）。
- 発送拠点・返却拠点の既定値は**主デモ機の配置拠点**。
- サーバ側で主・子すべてについて期間の重複（他予約・点検）を最終チェックする。1台でも重複する場合は登録を拒否し、どのデモ機がどの予約／点検と重複しているかを提示する。
- 登録成功時、案件は即 `CONFIRMED`。主・子すべてのデモ機ステータスを再計算する。

### 5.2 予約編集

- **デモ機の構成（主・子）は編集画面で読み取り専用**。追加・削除・付け替えは不可。
- 期間・送付先・出荷予定日・担当営業・顧客情報・拠点・備考は現行どおり編集可能。
- 期間を変更した場合、**主＋アクティブな子すべて**について、当該案件を除外して重複を再チェックする。1台でも重複する場合は更新を拒否する。

### 5.3 子デモ機の個別キャンセル

- 予約詳細画面で、アクティブな子デモ機ごとに「キャンセル」操作を提供する。
- 実行可能条件: 案件が `CONFIRMED` であること、かつ対象の子が `ACTIVE` であること。
- 処理: 対象 `ReservationUnit.status = "CANCELLED"`、`cancelledAt` を記録。対象デモ機のステータスを再計算する。
- 子をすべてキャンセルしても、主デモ機が有効であれば案件は `CONFIRMED` のまま継続する。
- 主デモ機に対する個別キャンセルは提供しない。

### 5.4 案件キャンセル

- 実行可能条件: 案件が **`CONFIRMED` のときのみ**。`PICKED_UP`（出荷後）・`RETURNED`・`CANCELLED` では不可。
- この制約は**子を持たない単一台予約にも適用**する（現行の「貸出中でもキャンセル可」を廃止）。
- 処理: `Reservation.status = "CANCELLED"`。主＋アクティブな子すべてのデモ機ステータスを再計算する。

### 5.5 出庫（チェックアウト）

- 案件単位で一括。**一部出荷は不可**。
- 出荷前チェック（整備完了・同梱部品・インバーター）は案件で1セット（現行どおり）。
- 処理: `Reservation.status = "PICKED_UP"` ほか現行どおり。主＋アクティブな子すべてのデモ機ステータスを再計算する（キャンセル済みの子は対象外）。

### 5.6 返却（チェックイン）

- 案件単位で一括。**一部返却は不可**。
- 処理: `Reservation.status = "RETURNED"` ほか現行どおり。主＋アクティブな子すべてのデモ機ステータスを再計算する。

### 5.7 表示

- 予約詳細ヘッダ・予約一覧のデモ機表記は `主デモ機名 + 他○件`。○ はアクティブな子の件数。子が0件（またはすべてキャンセル済み）のときは `他○件` を付記しない。
- **キャンセル済みの子デモ機は全画面で非表示**（詳細のデモ機一覧、スケジュール、デモ機詳細の予約一覧など）。
- スケジュールのバーは**従来どおり1台1バー**。主＋各アクティブ子ごとにバーを描画する。見た目・挙動は現行と同等。

## 6. データモデル変更

### 6.1 新規テーブル `ReservationUnit`（子デモ機の紐付け専用）

```prisma
model ReservationUnit {
  id            String    @id @default(cuid())
  reservationId String
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  demoUnitId    String
  demoUnit      DemoUnit  @relation(fields: [demoUnitId], references: [id])
  status        String    @default("ACTIVE") // ACTIVE | CANCELLED
  createdAt     DateTime  @default(now())
  cancelledAt   DateTime?

  @@unique([reservationId, demoUnitId])
  @@index([demoUnitId, status])
}
```

### 6.2 既存モデルの変更

- `Reservation`
  - `demoUnitId` / `demoUnit` リレーションは**そのまま維持**し、「主デモ機」として扱う。
  - リレーション追加: `childUnits ReservationUnit[]`
- `DemoUnit`
  - リレーション追加: `reservationUnits ReservationUnit[]`

### 6.3 マイグレーション方針

- **テーブル追加のみ**。カラム削除・リネーム・データバックフィルは行わない。
- 既存の予約は「子0件の案件」として引き続き有効。移行スクリプト不要。
- 本番（Vercel Postgres / Neon）へは通常の `prisma migrate deploy` で適用可能。

## 7. 空き状況判定ロジックの変更（`lib/availability.ts`）

対象デモ機を「**主デモ機、または当該案件でアクティブな子デモ機**」として含む予約を判定対象にする。関数シグネチャ（引数に単一 `unitId` を取る）は変更しない。

- `getConflicts(unitId, start, end, excludeReservationId?)`
  - 予約検索条件に以下の OR を追加:
    ```ts
    OR: [
      { demoUnitId: unitId },
      { childUnits: { some: { demoUnitId: unitId, status: "ACTIVE" } } },
    ]
    ```
  - 返り値の形（`reservations` / `maintenance`）は変更しない。
- `isUnitAvailable(...)`
  - 上記 `getConflicts` を利用。ロジック変更なし。
- `findAvailableUnits(...)`
  - 各デモ機について `getConflicts` で判定する現行構造のまま。
- `recomputeUnitStatus(unitId)`
  - `MAINTENANCE` 判定: 現行どおり。
  - `LOANED` 判定: `status = PICKED_UP` かつ（`demoUnitId = unitId` または アクティブな子に `unitId` を含む）予約が存在するか。
  - `RESERVED` 判定: `status = CONFIRMED` かつ `endDate >= 今日` かつ（主 または アクティブな子）に `unitId` を含む予約が存在するか。
  - それ以外は `AVAILABLE`。

## 8. サーバアクションの変更（`app/(app)/reservations/actions.ts`）

### 8.1 `createReservation`

- 入力: `primaryDemoUnitId`（必須）、`childDemoUnitIds`（0〜2、任意）、その他は現行どおり。
- バリデーション:
  1. 子は最大2台。
  2. 主IDが子IDに含まれない。
  3. 子ID重複なし。
  4. 主・子すべてのデモ機が存在し、`RETIRED` でない。
  5. 主・子すべての `homeLocationId` が一致。
- 空き判定: 主＋各子について `isUnitAvailable`。1台でもNGなら、重複しているデモ機と相手（予約／点検）を列挙してエラー返却。
- 作成: `Reservation`（`demoUnitId = 主`）と `childUnits` の nested create を1トランザクションで実行。
- 後処理: 主＋各子について `recomputeUnitStatus`。
- 遷移: 現行どおり作成した予約詳細へ。

### 8.2 `updateReservation`

- デモ機構成は更新対象外（現行の `reservationEditSchema` が台IDを `omit` している方針を踏襲）。
- 期間変更時の重複再チェックを、主＋アクティブな子すべてに対して実施（当該案件を除外）。1台でもNGなら更新拒否。
- 後処理: 主＋アクティブな子について `recomputeUnitStatus`。

### 8.3 `cancelReservationUnit`（新規）

- 入力: `reservationUnitId`。
- ガード: 親 `Reservation.status === "CONFIRMED"` かつ 対象 `ReservationUnit.status === "ACTIVE"`。満たさない場合はエラー。
- 処理: `status = "CANCELLED"`、`cancelledAt = now()`。対象 `demoUnitId` について `recomputeUnitStatus`。
- 再検証: 一覧・詳細・スケジュール・ダッシュボードのパスを revalidate。

### 8.4 `checkoutReservation` / `checkinReservation`

- 状態遷移・入力項目は現行どおり。
- `recomputeUnitStatus` を主＋アクティブな子すべてに対してループ実行するよう変更。

### 8.5 `cancelReservation`

- ガードを **`status === "CONFIRMED"` のときのみ許可**に変更（`PICKED_UP` / `RETURNED` / `CANCELLED` は不可）。
- `recomputeUnitStatus` を主＋アクティブな子すべてに対してループ実行。

## 9. バリデーション一覧（`lib/validators.ts`）

| 対象 | ルール | エラーメッセージ例 |
|---|---|---|
| 主デモ機 | 必須 | 「主デモ機を選択してください」 |
| 子デモ機 | 0〜2台 | 「子デモ機は2台までです」 |
| 主／子の重複 | 主IDが子IDに含まれない／子ID重複なし | 「同じデモ機を重複して選択できません」 |
| 配置拠点 | 主・子すべて同一 `homeLocationId`（※DB参照が必要なためサーバアクション側で検証） | 「配置拠点が異なるデモ機は同じ予約にできません」 |
| デモ機状態 | 主・子すべて `RETIRED` でない | 「選択できないデモ機が含まれています」 |
| 期間 | 返却日 ≥ 貸出日（現行どおり） | 「返却日は貸出日以降にしてください」 |
| 期間重複 | 主・子すべてが空き | 「○○（管理番号）が {期間}（{顧客}）の予約と重複しています」 |

- `reservationFields` の `demoUnitId` を `primaryDemoUnitId` に変更し、`childDemoUnitIds: z.array(z.string()).max(2).optional()` を追加。
- `reservationEditSchema` は従来どおりデモ機IDを `omit`。

## 10. 画面仕様

### 10.1 新規予約フォーム（`app/(app)/reservations/ReservationForm.tsx`）

- 空き検索の結果リストで、各デモ機の行に「**主**」ラジオと「**子**」チェックボックスを表示する。
- 主が未選択の間は子を選択できない（または選択時にガイドを表示）。
- 主を選択した時点で:
  - 発送拠点・返却拠点をその配置拠点に設定。
  - 以降の空き検索を同一拠点にロック（拠点フィルタを固定）。
- 子として選択できるのは主と異なるデモ機のみ。子が2台に達したら3台目以降のチェックを抑止。
- hidden 入力: `primaryDemoUnitId`、`childDemoUnitIds`（複数）。
- 「選択中のデモ機」サマリに主＋子を一覧表示。
- 登録ボタンは主が未選択のとき無効。

### 10.2 予約詳細（`app/(app)/reservations/[id]/page.tsx`）

- ヘッダ: `予約: {主デモ機名} 他{アクティブな子の件数}件`（子0件なら `他○件` なし）。
- 「デモ機」セクション: 主を先頭に、アクティブな子を列挙。各行にデモ機詳細へのリンク。
- 各子の行に「キャンセル」操作を表示（案件が `CONFIRMED` のときのみ）。
- キャンセル済みの子は表示しない。
- 「予約をキャンセル」ボタンは `CONFIRMED` のときのみ表示（現行の表示条件を変更）。

### 10.3 予約一覧（`app/(app)/reservations/page.tsx`）

- デモ機列を `{主デモ機名} 他{アクティブな子の件数}件` とする。管理番号は主デモ機のもの。
- `include` に `childUnits`（→ `demoUnit`）を追加。

### 10.4 スケジュール（`app/(app)/schedule/page.tsx` / `components/ScheduleTimeline.tsx`）

- `demoUnit` の予約取得を、`childUnits` 経由の子予約も含むよう拡張。
- バーは主＋各アクティブ子ごとに描画（キャンセル済みの子は除外）。1台1バーで現行と同じ見た目。

### 10.5 ダッシュボード（`app/(app)/page.tsx`）

- 本日／明日の出荷・返却予定、返却遅延の各行のデモ機表記を `{主デモ機名} 他{N}件` に。
- 案件は引き続き1行で表示。

### 10.6 デモ機詳細（`app/(app)/units/[id]/page.tsx`）

- 「予約・貸出（進行中／予定）」「貸出履歴」に、主予約に加えて `reservationUnits` 経由の子予約も含める。
- `ReservationUnit.status = "CANCELLED"` の子予約は除外。

## 11. 影響範囲（変更ファイル）

| ファイル | 変更概要 | 規模 |
|---|---|---|
| `prisma/schema.prisma` | `ReservationUnit` 追加、`Reservation.childUnits` / `DemoUnit.reservationUnits` 追加 | 小 |
| `prisma/migrations/**` | 追加のみのマイグレーション1本 | 小 |
| `lib/availability.ts` | `getConflicts` / `recomputeUnitStatus` に主OR子の条件追加 | 中 |
| `lib/validators.ts` | `primaryDemoUnitId` / `childDemoUnitIds`、重複チェック refine | 小 |
| `app/(app)/reservations/actions.ts` | `createReservation` の複数台対応、`cancelReservationUnit` 新規、出庫／返却／案件キャンセルの recompute ループ化、案件キャンセルのガード変更 | 中 |
| `app/(app)/reservations/ReservationForm.tsx` | 主ラジオ＋子チェックボックス、拠点ロック、hidden 複数化 | 中 |
| `app/(app)/reservations/new/page.tsx` | フォームへ渡す props 調整（必要に応じて） | 小 |
| `app/(app)/reservations/[id]/page.tsx` | ヘッダ表記、デモ機一覧の主／子表示、子キャンセルボタン、案件キャンセルボタンの表示条件 | 中 |
| `app/(app)/reservations/[id]/edit/page.tsx` / `ReservationEditForm.tsx` | デモ機ラベルを主＋子の一覧表示（読み取り専用） | 小 |
| `app/(app)/reservations/page.tsx` | デモ機列の表記、`include` 追加 | 小 |
| `app/(app)/schedule/page.tsx` / `components/ScheduleTimeline.tsx` | 子予約をバー生成に含める | 中 |
| `app/(app)/page.tsx` | 出荷・返却・遅延リストの表記 | 小 |
| `app/(app)/units/[id]/page.tsx` | 子予約を予約一覧・履歴に含める | 小 |
| `app/api/units/available/route.ts` | `findAvailableUnits` 経由で自動対応。レスポンス形は不変（変更なし想定） | なし〜小 |
| `prisma/seed.ts` | 既存シードは子0件で有効。マルチ台のデモデータは任意で追加 | 小 |
| `lib/*.test.ts` | フィクスチャ更新、新規ケース追加（§13） | 中 |

## 12. 非対象（本仕様でやらないこと）

- デモ機ごとの出荷情報（送り状番号・出荷日・着指定・運送会社）の分割。案件で1つのまま。
- デモ機ごとの出庫チェックリスト。案件で1セットのまま。
- 一部出荷・一部返却。
- 登録後のデモ機（主・子）の追加。
- 主デモ機の付け替え・編集。
- 合計3台を超える予約。
- 出荷後（`PICKED_UP` 以降）の案件キャンセル・子キャンセル。

## 13. テスト観点

- 主＋子2台で予約作成 → 3台とも `RESERVED` になる。
- 子を3台指定 → バリデーションエラー。
- 主と同一のデモ機を子に指定 → エラー。
- 配置拠点が異なるデモ機を混在 → エラー。
- 主・子のいずれかが期間重複 → 作成失敗、重複したデモ機が提示される。
- 子1台を `CONFIRMED` でキャンセル → 当該デモ機が `AVAILABLE` に戻る、案件は継続、詳細・一覧から非表示、`他○件` が1減る。
- `PICKED_UP` 後に子キャンセルを試行 → 不可。
- `PICKED_UP` 後に案件キャンセルを試行 → 不可（子を持たない単一台予約でも同様）。
- 出庫 → 主＋アクティブな子が `LOANED`、キャンセル済みの子は対象外。
- 返却 → 主＋アクティブな子が `AVAILABLE`。
- 編集で期間変更し、子が他予約と重複 → 更新失敗。
- 既存の単一台予約（子0件）が引き続き正常に表示・出庫・返却・キャンセルできる（回帰）。

## 14. 未決事項

なし（子デモ機の上限＝2台、キャンセル済みの子は非表示、主に選んだデモ機は子に選択不可、いずれも確定）。
