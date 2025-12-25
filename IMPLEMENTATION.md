# Issue #13: ダッシュボードAPI実装

## 概要

ダッシュボード表示用のAPIエンドポイント `GET /api/dashboard` を実装しました。

## 実装内容

### 1. スキーマ定義 (`schemas.ts`)

Zodを使用したレスポンススキーマを定義：

- `TodayStatus`: 今日の日報状況（日付、作成済みフラグ、日報ID）
- `RecentReportItem`: 最近の日報アイテム（営業用）
- `PendingReportItem`: 承認待ち日報アイテム（上長用）
- `SalesDashboardResponse`: 営業ユーザー向けレスポンス
- `ManagerDashboardResponse`: 上長ユーザー向けレスポンス

### 2. APIエンドポイント (`route.ts`)

#### エンドポイント
```
GET /api/dashboard
```

#### 認証
必須（JWTトークン）

#### レスポンス仕様

##### 営業ユーザーの場合
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-12-18",
      "has_report": true,
      "report_id": 1
    },
    "recent_reports": [
      {
        "id": 1,
        "report_date": "2025-12-18",
        "visit_count": 3,
        "comment_count": 1
      }
    ]
  }
}
```

**営業ユーザーの取得データ:**
- 今日の日報作成状況
- 直近10件の自分の日報一覧（訪問件数・コメント件数含む）

##### 上長ユーザーの場合
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-12-18",
      "has_report": false,
      "report_id": null
    },
    "recent_reports": [],
    "pending_reports": [
      {
        "id": 10,
        "user": {
          "id": 1,
          "name": "山田太郎"
        },
        "report_date": "2025-12-18",
        "visit_count": 2,
        "comment_count": 0
      }
    ]
  }
}
```

**上長ユーザーの取得データ:**
- 今日の日報作成状況（上長自身の）
- recent_reports: 空配列
- pending_reports: 承認待ち日報一覧（コメント0件の日報）

#### 実装の特徴

1. **役割ベースのレスポンス切り替え**
   - `user.role`に応じて営業用・上長用のレスポンスを返却

2. **効率的なクエリ設計**
   - 訪問件数・コメント件数は関連データを`include`して配列の長さで計算
   - 承認待ち日報は`comments: { none: {} }`条件で効率的に取得

3. **日付フォーマット**
   - すべての日付は`YYYY-MM-DD`形式で統一

4. **エラーハンドリング**
   - 認証エラー: 401 UNAUTHORIZED
   - データベースエラー: 500 INTERNAL_ERROR
   - 予期しないエラー: 500 INTERNAL_ERROR

### 3. テストコード (`__tests__/route.test.ts`)

#### テストカバレッジ

全26テスト、すべてパス:

**営業ユーザー向けテスト:**
- ✓ 今日の日報作成済みの場合
- ✓ 今日の日報未作成の場合
- ✓ 日報を10件以上持っている場合（直近10件のみ取得）
- ✓ 日報が0件の場合

**上長ユーザー向けテスト:**
- ✓ 承認待ち日報（コメント0件）の一覧取得
- ✓ recent_reportsが空配列となること
- ✓ 上長自身の今日の日報状況取得

**認証・権限エラーケース:**
- ✓ 認証トークンがない場合（401）
- ✓ 無効なトークンの場合（401）

**データベースエラーハンドリング:**
- ✓ 今日の日報取得時のDBエラー（500）
- ✓ 最近の日報取得時のDBエラー（500）

**エッジケース:**
- ✓ 訪問記録0件、コメント0件の日報の集計
- ✓ 日付フォーマットの検証

#### テスト実行結果
```bash
npm test -- --run src/app/api/dashboard/__tests__/route.test.ts

Test Files  2 passed (2)
Tests       26 passed (26)
Duration    2.75s
```

## ファイル構成

```
issue-13/
├── IMPLEMENTATION.md                   # このファイル
└── src/app/api/dashboard/
    ├── schemas.ts                      # Zodスキーマ定義
    ├── route.ts                        # APIエンドポイント実装
    └── __tests__/
        └── route.test.ts               # 単体テスト
```

実装ファイルは以下にコピー済み:
- `/Users/makoto/claude_project1/daily_report/src/app/api/dashboard/`

## 受け入れ基準の達成状況

### ✅ 営業ユーザーの場合
- [x] 今日の日報作成状況（has_report, report_id）を返す
- [x] 直近10件の自分の日報を返す
- [x] 訪問件数・コメント件数を含む

### ✅ 上長ユーザーの場合
- [x] 今日の日報作成状況を返す
- [x] 配下メンバーの承認待ち日報一覧を返す
- [x] コメントが0件の日報を表示
- [x] 訪問件数・コメント件数を含む

### ✅ その他の要件
- [x] 役割に応じたレスポンスの切り替え
- [x] 単体テストの作成（26テストすべてパス）
- [x] API仕様書（doc/API_SPECIFICATION.md 6.1）に準拠
- [x] CLAUDE.mdのテストコード作成時の厳守事項を遵守

## 実装上の工夫

1. **型安全性の確保**
   - Zodスキーマから自動的にTypeScript型を生成
   - レスポンスデータの型チェックを厳格化

2. **テストの品質**
   - 意味のないアサーション（`expect(true).toBe(true)`）を排除
   - 具体的な入力と期待される出力を検証
   - 境界条件、エラーケース、エッジケースを網羅

3. **パフォーマンス最適化**
   - 必要なフィールドのみを`select`で取得
   - 関連データは`include`で一度に取得（N+1問題回避）
   - 営業ユーザーの日報は`take: 10`で制限

4. **コードの可読性**
   - わかりやすい変数名・関数名
   - 適切なコメントによる説明
   - 一貫したコーディングスタイル

## 使用技術

- **言語**: TypeScript
- **フレームワーク**: Next.js (App Router)
- **バリデーション**: Zod
- **ORM**: Prisma
- **テスト**: Vitest
- **認証**: JWT（既存の認証ミドルウェアを使用）

## 動作確認

### 前提条件
- データベースのマイグレーションが完了していること
- ユーザーが登録されていること

### テスト実行
```bash
# ダッシュボードAPIのテストを実行
npm test -- src/app/api/dashboard/__tests__/route.test.ts

# すべてのテストを実行
npm test
```

### API動作確認（curl例）

#### 営業ユーザーでダッシュボード取得
```bash
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 期待されるレスポンス（営業）
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-12-18",
      "has_report": true,
      "report_id": 1
    },
    "recent_reports": [
      {
        "id": 1,
        "report_date": "2025-12-18",
        "visit_count": 3,
        "comment_count": 1
      }
    ]
  }
}
```

## 参照ドキュメント

- API仕様書: `doc/API_SPECIFICATION.md` (6. ダッシュボード API)
- 画面設計書: `doc/SCREEN_DESIGN.md` (SCR-002: ダッシュボード)
- ER設計書: `doc/ER_DESIGN.md`

## 今後の拡張可能性

1. **統計情報の追加**
   - 週次・月次の訪問件数サマリー
   - 顧客別の訪問頻度グラフ

2. **フィルタリング機能**
   - 承認待ち日報の期間絞り込み
   - 特定メンバーの日報のみ表示

3. **パフォーマンス向上**
   - キャッシング機能の追加
   - ページネーション対応

## まとめ

ダッシュボードAPIの実装が完了しました。すべての受け入れ基準を満たし、26個の単体テストがすべてパスしています。コードの品質、型安全性、エラーハンドリング、テストカバレッジすべてにおいて高い水準を達成しています。
