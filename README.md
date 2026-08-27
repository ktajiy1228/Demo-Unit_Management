# デモ機運用管理（Demo-Unit Management）

照明器具のデモ機（実機サンプル）の貸出・返却・スケジュールを、レンタカーの
運用管理と同じ発想で管理する Web アプリのプロトタイプです。

- **予約カレンダー**: 行＝デモ機 / 列＝日付のタイムラインで空き状況をひと目で把握
- **ダブルブッキング防止**: 期間が重なる予約はサーバ側で拒否
- **貸出ライフサイクル**: 申請 → 確定 → 出庫 → 返却（各段階で状態メモを記録）
- **返却遅延アラート**: 返却予定日を過ぎた貸出をダッシュボードに表示
- **機器台帳 / 点検・修理記録**: 型番・シリアル・付属品・点検履歴を管理
- **拠点・権限**: 複数拠点の在庫を管理。ADMIN / MANAGER / STAFF の 3 権限

## 技術構成

| 領域 | 採用 |
|---|---|
| フレームワーク | Next.js 15 (App Router) / React 19 / TypeScript |
| DB / ORM | SQLite + Prisma（`prisma/schema.prisma` の datasource を変えれば Postgres 化可能） |
| 認証 | Auth.js (NextAuth v5) Credentials プロバイダ、JWT セッション |
| UI | Tailwind CSS v4（自作の軽量コンポーネント） |
| バリデーション | Zod（`lib/validators.ts`） |
| テスト | Vitest（`lib/*.test.ts`） |

## セットアップ

```bash
npm install                 # 依存インストール（postinstall で prisma generate）
npm run db:migrate           # SQLite にスキーマを適用（初回のみ）
npm run db:seed              # サンプルデータ投入
npm run dev                  # http://localhost:3000
```

DB を初期状態に戻したいとき:

```bash
npm run db:reset && npm run db:seed
```

## ログイン情報（シード）

初期パスワードは全ユーザー共通 **`password`** です（プロトタイプ用）。

| メールアドレス | 権限 | 拠点 |
|---|---|---|
| `admin@example.com` | 管理者 (ADMIN) | 本社 |
| `manager.honsha@example.com` | 拠点管理者 (MANAGER) | 本社 |
| `manager.amagasaki@example.com` | 拠点管理者 (MANAGER) | 尼崎倉庫 |
| `staff1@example.com` | 営業 (STAFF) | 本社 |
| `staff2@example.com` | 営業 (STAFF) | 尼崎倉庫 |
| `staff3@example.com` | 営業 (STAFF) | 尼崎倉庫 |

## 権限

| 操作 | STAFF | MANAGER | ADMIN |
|---|:-:|:-:|:-:|
| 予約の作成・出庫・返却・キャンセル | ✓ | ✓ | ✓ |
| デモ機の登録・編集、点検記録 | | ✓ | ✓ |
| マスタ管理（拠点 / カテゴリ / ユーザー） | | | ✓ |

## 画面

| ルート | 内容 |
|---|---|
| `/login` | ログイン |
| `/` | ダッシュボード（本日の出庫・返却、返却遅延、点検中、状態サマリ） |
| `/schedule` | 予約カレンダー（タイムライン、拠点/カテゴリ絞り込み、4週送り） |
| `/reservations` | 予約一覧（ステータス別タブ） |
| `/reservations/new` | 新規予約（期間で空きデモ機を検索 → 選択 → 内容入力。返却日は貸出日+7日を自動設定、納入先も入力可） |
| `/reservations/[id]` | 予約詳細（確定 / 出庫 / 返却 / キャンセル）。出庫時に **送り状No.・出荷日** と **出荷前チェック（整備完了 / 同梱部品 / インバーター）** を記録（3項目すべてチェックしないと出庫不可） |
| `/units` | デモ機一覧（カテゴリ/拠点/状態/フリーワード絞り込み） |
| `/units/[id]` | デモ機詳細（台帳・予約・貸出履歴・点検記録） |
| `/units/new`, `/units/[id]/edit` | デモ機の登録・編集 |
| `/masters` | マスタ管理 |

## データモデル

`Location`（拠点） / `User` / `Category` / `DemoUnit`（デモ機） /
`Reservation`（予約・貸出） / `MaintenanceRecord`（点検・修理）。
詳細は `prisma/schema.prisma` を参照。区分値は `lib/constants.ts` に集約。

`Reservation` の出荷関連フィールド（要求元資料「デモ機出荷業務について」対応）:
`endUser`（納入先）/ `shipDate`（出荷日）/ `shippingTrackingNo`（送り状No.）/
`partsChecked`・`maintenanceChecked`・`inverterChecked`（出荷前チェック）。

空き判定・ステータス再計算のロジックは `lib/availability.ts`:

- `isUnitAvailable(unitId, start, end, excludeReservationId?)`
- `findAvailableUnits({ start, end, categoryId?, locationId? })`
- `recomputeUnitStatus(unitId)` — 予約 / 出庫 / 返却 / 点検の後に呼ぶ

## テスト

```bash
npm test
```

`lib/availability.test.ts`（期間重複・競合検出）と
`lib/reservation-flow.test.ts`（予約作成 → 重複拒否 → 出庫 → 返却の遷移）。
テストは `prisma/dev.db` に一時レコードを作成し、実行後に削除します。

## 本番化に向けたメモ（プロトタイプの割り切り）

- `.env` の `AUTH_SECRET` はダミー。デプロイ時に `openssl rand -base64 32` で再生成する
- SQLite → Postgres（`schema.prisma` の datasource と `DATABASE_URL` を変更）
- パスワードは共通初期値。パスワード変更 / リセット画面は未実装
- 画像は URL 参照のみ（アップロード機構なし）
- 監査ログ、メール通知、CSV エクスポートは未実装
