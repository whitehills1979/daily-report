# 営業日報システム API仕様書

## 概要

本ドキュメントは営業日報システムのREST API仕様を定義します。

### ベースURL

```
https://api.example.com/v1
```

### 認証方式

- JWT (JSON Web Token) を使用
- Authorization ヘッダーに Bearer トークンを設定

```
Authorization: Bearer {token}
```

### レスポンス形式

- Content-Type: `application/json`
- 文字コード: UTF-8

### 共通レスポンスフォーマット

#### 成功時

```json
{
  "success": true,
  "data": { ... }
}
```

#### エラー時

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [ ... ]
  }
}
```

### 共通HTTPステータスコード

| ステータスコード | 説明                                          |
| ---------------- | --------------------------------------------- |
| 200              | OK - リクエスト成功                           |
| 201              | Created - リソース作成成功                    |
| 204              | No Content - 削除成功（レスポンスボディなし） |
| 400              | Bad Request - リクエストが不正                |
| 401              | Unauthorized - 認証エラー                     |
| 403              | Forbidden - 権限エラー                        |
| 404              | Not Found - リソースが存在しない              |
| 422              | Unprocessable Entity - バリデーションエラー   |
| 500              | Internal Server Error - サーバーエラー        |

### 共通エラーコード

| エラーコード     | 説明                         |
| ---------------- | ---------------------------- |
| UNAUTHORIZED     | 認証が必要です               |
| FORBIDDEN        | アクセス権限がありません     |
| NOT_FOUND        | リソースが見つかりません     |
| VALIDATION_ERROR | 入力値が不正です             |
| DUPLICATE_ERROR  | 既に登録されています         |
| INTERNAL_ERROR   | サーバーエラーが発生しました |

---

## 1. 認証 API

### 1.1 ログイン

ユーザー認証を行い、JWTトークンを発行します。

**エンドポイント**

```
POST /api/auth/login
```

**認証**: 不要

**リクエストボディ**

```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

| フィールド | 型     | 必須 | 説明           |
| ---------- | ------ | ---- | -------------- |
| email      | string | ○    | メールアドレス |
| password   | string | ○    | パスワード     |

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "yamada@example.com",
      "role": "sales",
      "department": "営業部"
    }
  }
}
```

**エラーレスポンス (401 Unauthorized)**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "メールアドレスまたはパスワードが正しくありません"
  }
}
```

---

### 1.2 ログアウト

ログアウト処理を行います。

**エンドポイント**

```
POST /api/auth/logout
```

**認証**: 必要

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "message": "ログアウトしました"
  }
}
```

---

### 1.3 ログインユーザー情報取得

現在ログインしているユーザーの情報を取得します。

**エンドポイント**

```
GET /api/auth/me
```

**認証**: 必要

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "department": "営業部",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## 2. 日報 API

### 2.1 日報一覧取得

日報の一覧を取得します。

**エンドポイント**

```
GET /api/reports
```

**認証**: 必要

**クエリパラメータ**

| パラメータ  | 型      | 必須 | 説明                           | デフォルト値     |
| ----------- | ------- | ---- | ------------------------------ | ---------------- |
| user_id     | integer | -    | ユーザーID（上長のみ指定可能） | ログインユーザー |
| date_from   | date    | -    | 開始日（YYYY-MM-DD）           | 当月1日          |
| date_to     | date    | -    | 終了日（YYYY-MM-DD）           | 本日             |
| customer_id | integer | -    | 顧客ID                         | -                |
| page        | integer | -    | ページ番号                     | 1                |
| per_page    | integer | -    | 1ページあたりの件数            | 20               |

**リクエスト例**

```
GET /api/reports?date_from=2025-12-01&date_to=2025-12-31&page=1
```

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": 1,
        "user": {
          "id": 1,
          "name": "山田太郎"
        },
        "report_date": "2025-12-18",
        "visit_count": 3,
        "comment_count": 1,
        "created_at": "2025-12-18T18:30:00Z",
        "updated_at": "2025-12-18T18:30:00Z"
      },
      {
        "id": 2,
        "user": {
          "id": 1,
          "name": "山田太郎"
        },
        "report_date": "2025-12-17",
        "visit_count": 2,
        "comment_count": 0,
        "created_at": "2025-12-17T19:00:00Z",
        "updated_at": "2025-12-17T19:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_pages": 3,
      "total_count": 50
    }
  }
}
```

---

### 2.2 日報詳細取得

指定した日報の詳細情報を取得します。

**エンドポイント**

```
GET /api/reports/:id
```

**認証**: 必要

**パスパラメータ**

| パラメータ | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 日報ID |

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "user": {
      "id": 1,
      "name": "山田太郎",
      "department": "営業部"
    },
    "report_date": "2025-12-18",
    "problem": "ABC社の決裁フローが長く、受注までの期間短縮方法を相談したい。",
    "plan": "・ABC社のキーマンリサーチ\n・XYZ商事への見積書作成",
    "visits": [
      {
        "id": 1,
        "customer": {
          "id": 1,
          "name": "田中一郎",
          "company_name": "株式会社ABC"
        },
        "visit_content": "新商品の提案を実施。好感触で、次回見積提示の約束を取り付けた。",
        "visit_time": "14:00:00",
        "duration_minutes": 60,
        "created_at": "2025-12-18T18:30:00Z"
      },
      {
        "id": 2,
        "customer": {
          "id": 2,
          "name": "鈴木次郎",
          "company_name": "XYZ商事株式会社"
        },
        "visit_content": "既存契約の更新について打ち合わせ。",
        "visit_time": "16:00:00",
        "duration_minutes": 45,
        "created_at": "2025-12-18T18:30:00Z"
      }
    ],
    "comments": [
      {
        "id": 1,
        "user": {
          "id": 10,
          "name": "佐藤部長",
          "role": "manager"
        },
        "comment_type": "problem",
        "content": "キーマンを特定して直接アプローチを検討しましょう。",
        "created_at": "2025-12-18T19:00:00Z"
      }
    ],
    "created_at": "2025-12-18T18:30:00Z",
    "updated_at": "2025-12-18T18:30:00Z"
  }
}
```

**エラーレスポンス (404 Not Found)**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "日報が見つかりません"
  }
}
```

---

### 2.3 日報作成

新規日報を作成します。

**エンドポイント**

```
POST /api/reports
```

**認証**: 必要（営業のみ）

**リクエストボディ**

```json
{
  "report_date": "2025-12-18",
  "problem": "ABC社の決裁フローが長く、受注までの期間短縮方法を相談したい。",
  "plan": "・ABC社のキーマンリサーチ\n・XYZ商事への見積書作成",
  "visits": [
    {
      "customer_id": 1,
      "visit_content": "新商品の提案を実施。好感触で、次回見積提示の約束を取り付けた。",
      "visit_time": "14:00",
      "duration_minutes": 60
    },
    {
      "customer_id": 2,
      "visit_content": "既存契約の更新について打ち合わせ。",
      "visit_time": "16:00",
      "duration_minutes": 45
    }
  ]
}
```

| フィールド                | 型      | 必須 | 説明                         |
| ------------------------- | ------- | ---- | ---------------------------- |
| report_date               | date    | ○    | 日報日付（YYYY-MM-DD）       |
| problem                   | string  | -    | 課題・相談（2000文字以内）   |
| plan                      | string  | -    | 明日やること（2000文字以内） |
| visits                    | array   | ○    | 訪問記録（1件以上必須）      |
| visits[].customer_id      | integer | ○    | 顧客ID                       |
| visits[].visit_content    | string  | ○    | 訪問内容（1000文字以内）     |
| visits[].visit_time       | time    | -    | 訪問時刻（HH:MM）            |
| visits[].duration_minutes | integer | -    | 訪問時間（分）               |

**レスポンス (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_date": "2025-12-18",
    "problem": "ABC社の決裁フローが長く...",
    "plan": "・ABC社のキーマンリサーチ...",
    "visits": [
      {
        "id": 1,
        "customer_id": 1,
        "visit_content": "新商品の提案を実施...",
        "visit_time": "14:00:00",
        "duration_minutes": 60
      }
    ],
    "created_at": "2025-12-18T18:30:00Z",
    "updated_at": "2025-12-18T18:30:00Z"
  }
}
```

**エラーレスポンス (422 Unprocessable Entity)**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "report_date",
        "message": "この日付の日報は既に登録されています"
      },
      {
        "field": "visits",
        "message": "訪問記録を少なくとも1件追加してください"
      }
    ]
  }
}
```

---

### 2.4 日報更新

既存の日報を更新します。

**エンドポイント**

```
PUT /api/reports/:id
```

**認証**: 必要（本人のみ）

**パスパラメータ**

| パラメータ | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 日報ID |

**リクエストボディ**

```json
{
  "problem": "ABC社の決裁フローが長く、受注までの期間短縮方法を相談したい。",
  "plan": "・ABC社のキーマンリサーチ\n・XYZ商事への見積書作成",
  "visits": [
    {
      "id": 1,
      "customer_id": 1,
      "visit_content": "新商品の提案を実施。好感触で、次回見積提示の約束を取り付けた。",
      "visit_time": "14:00",
      "duration_minutes": 60
    },
    {
      "customer_id": 2,
      "visit_content": "既存契約の更新について打ち合わせ。",
      "visit_time": "16:00",
      "duration_minutes": 45
    }
  ]
}
```

**注意**:

- visits 配列に `id` がある場合は更新、ない場合は新規作成
- 既存の訪問記録で配列に含まれないものは削除される

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_date": "2025-12-18",
    "problem": "ABC社の決裁フローが長く...",
    "plan": "・ABC社のキーマンリサーチ...",
    "visits": [ ... ],
    "created_at": "2025-12-18T18:30:00Z",
    "updated_at": "2025-12-18T19:00:00Z"
  }
}
```

**エラーレスポンス (403 Forbidden)**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "この日報を編集する権限がありません"
  }
}
```

---

### 2.5 日報削除

日報を削除します。

**エンドポイント**

```
DELETE /api/reports/:id
```

**認証**: 必要（本人のみ）

**パスパラメータ**

| パラメータ | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 日報ID |

**レスポンス (204 No Content)**

レスポンスボディなし

**エラーレスポンス (403 Forbidden)**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "この日報を削除する権限がありません"
  }
}
```

---

## 3. コメント API

### 3.1 コメント追加

日報にコメントを追加します。

**エンドポイント**

```
POST /api/reports/:id/comments
```

**認証**: 必要（上長のみ）

**パスパラメータ**

| パラメータ | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 日報ID |

**リクエストボディ**

```json
{
  "comment_type": "problem",
  "content": "キーマンを特定して直接アプローチを検討しましょう。"
}
```

| フィールド   | 型     | 必須 | 説明                                 |
| ------------ | ------ | ---- | ------------------------------------ |
| comment_type | string | ○    | コメント種別（problem/plan/general） |
| content      | string | ○    | コメント内容（500文字以内）          |

**レスポンス (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "user": {
      "id": 10,
      "name": "佐藤部長",
      "role": "manager"
    },
    "comment_type": "problem",
    "content": "キーマンを特定して直接アプローチを検討しましょう。",
    "created_at": "2025-12-18T19:00:00Z"
  }
}
```

---

### 3.2 コメント更新

既存のコメントを更新します。

**エンドポイント**

```
PUT /api/comments/:id
```

**認証**: 必要（本人のみ）

**パスパラメータ**

| パラメータ | 型      | 説明       |
| ---------- | ------- | ---------- |
| id         | integer | コメントID |

**リクエストボディ**

```json
{
  "content": "更新されたコメント内容"
}
```

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "content": "更新されたコメント内容",
    "updated_at": "2025-12-18T19:30:00Z"
  }
}
```

---

### 3.3 コメント削除

コメントを削除します。

**エンドポイント**

```
DELETE /api/comments/:id
```

**認証**: 必要（本人のみ）

**パスパラメータ**

| パラメータ | 型      | 説明       |
| ---------- | ------- | ---------- |
| id         | integer | コメントID |

**レスポンス (204 No Content)**

レスポンスボディなし

---

## 4. 顧客 API

### 4.1 顧客一覧取得

顧客の一覧を取得します。

**エンドポイント**

```
GET /api/customers
```

**認証**: 必要

**クエリパラメータ**

| パラメータ | 型      | 必須 | 説明                             | デフォルト値 |
| ---------- | ------- | ---- | -------------------------------- | ------------ |
| keyword    | string  | -    | 検索キーワード（会社名・顧客名） | -            |
| page       | integer | -    | ページ番号                       | 1            |
| per_page   | integer | -    | 1ページあたりの件数              | 20           |

**リクエスト例**

```
GET /api/customers?keyword=ABC&page=1
```

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 1,
        "name": "田中一郎",
        "company_name": "株式会社ABC",
        "phone": "03-1234-5678",
        "email": "tanaka@abc.co.jp",
        "address": "東京都千代田区...",
        "notes": "重要顧客",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_pages": 3,
      "total_count": 50
    }
  }
}
```

---

### 4.2 顧客詳細取得

指定した顧客の詳細情報を取得します。

**エンドポイント**

```
GET /api/customers/:id
```

**認証**: 必要

**パスパラメータ**

| パラメータ | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 顧客ID |

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "田中一郎",
    "company_name": "株式会社ABC",
    "phone": "03-1234-5678",
    "email": "tanaka@abc.co.jp",
    "address": "東京都千代田区丸の内1-1-1",
    "notes": "重要顧客。決裁権者。",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### 4.3 顧客作成

新規顧客を登録します。

**エンドポイント**

```
POST /api/customers
```

**認証**: 必要

**リクエストボディ**

```json
{
  "name": "田中一郎",
  "company_name": "株式会社ABC",
  "phone": "03-1234-5678",
  "email": "tanaka@abc.co.jp",
  "address": "東京都千代田区丸の内1-1-1",
  "notes": "重要顧客。決裁権者。"
}
```

| フィールド   | 型     | 必須 | 説明                   |
| ------------ | ------ | ---- | ---------------------- |
| name         | string | ○    | 顧客名（100文字以内）  |
| company_name | string | ○    | 会社名（200文字以内）  |
| phone        | string | -    | 電話番号（20文字以内） |
| email        | string | -    | メールアドレス         |
| address      | string | -    | 住所（500文字以内）    |
| notes        | string | -    | 備考（1000文字以内）   |

**レスポンス (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "田中一郎",
    "company_name": "株式会社ABC",
    "phone": "03-1234-5678",
    "email": "tanaka@abc.co.jp",
    "address": "東京都千代田区丸の内1-1-1",
    "notes": "重要顧客。決裁権者。",
    "created_at": "2025-12-18T20:00:00Z",
    "updated_at": "2025-12-18T20:00:00Z"
  }
}
```

---

### 4.4 顧客更新

既存顧客の情報を更新します。

**エンドポイント**

```
PUT /api/customers/:id
```

**認証**: 必要

**パスパラメータ**

| パラメータ | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 顧客ID |

**リクエストボディ**

```json
{
  "name": "田中一郎",
  "company_name": "株式会社ABC",
  "phone": "03-1234-5678",
  "email": "tanaka@abc.co.jp",
  "address": "東京都千代田区丸の内1-1-1",
  "notes": "重要顧客。決裁権者。次回アポ: 2026-01-15"
}
```

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "田中一郎",
    "company_name": "株式会社ABC",
    "phone": "03-1234-5678",
    "email": "tanaka@abc.co.jp",
    "address": "東京都千代田区丸の内1-1-1",
    "notes": "重要顧客。決裁権者。次回アポ: 2026-01-15",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-12-18T20:30:00Z"
  }
}
```

---

### 4.5 顧客削除

顧客を削除します。

**エンドポイント**

```
DELETE /api/customers/:id
```

**認証**: 必要

**パスパラメータ**

| パラメータ | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 顧客ID |

**レスポンス (204 No Content)**

レスポンスボディなし

**エラーレスポンス (422 Unprocessable Entity)**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "この顧客は日報で使用されているため削除できません"
  }
}
```

---

## 5. ユーザー API

### 5.1 ユーザー一覧取得

ユーザーの一覧を取得します。

**エンドポイント**

```
GET /api/users
```

**認証**: 必要（上長のみ）

**クエリパラメータ**

| パラメータ | 型      | 必須 | 説明                  | デフォルト値 |
| ---------- | ------- | ---- | --------------------- | ------------ |
| role       | string  | -    | 役割（sales/manager） | -            |
| department | string  | -    | 部署                  | -            |
| page       | integer | -    | ページ番号            | 1            |
| per_page   | integer | -    | 1ページあたりの件数   | 20           |

**リクエスト例**

```
GET /api/users?role=sales&page=1
```

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "name": "山田太郎",
        "email": "yamada@example.com",
        "role": "sales",
        "department": "営業部",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "佐藤花子",
        "email": "sato@example.com",
        "role": "sales",
        "department": "営業部",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_pages": 1,
      "total_count": 15
    }
  }
}
```

---

### 5.2 ユーザー詳細取得

指定したユーザーの詳細情報を取得します。

**エンドポイント**

```
GET /api/users/:id
```

**認証**: 必要（上長のみ）

**パスパラメータ**

| パラメータ | 型      | 説明       |
| ---------- | ------- | ---------- |
| id         | integer | ユーザーID |

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "department": "営業部",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### 5.3 ユーザー作成

新規ユーザーを登録します。

**エンドポイント**

```
POST /api/users
```

**認証**: 必要（上長のみ）

**リクエストボディ**

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "password123",
  "role": "sales",
  "department": "営業部"
}
```

| フィールド | 型     | 必須 | 説明                       |
| ---------- | ------ | ---- | -------------------------- |
| name       | string | ○    | 氏名（100文字以内）        |
| email      | string | ○    | メールアドレス（ユニーク） |
| password   | string | ○    | パスワード（8文字以上）    |
| role       | string | ○    | 役割（sales/manager）      |
| department | string | -    | 部署（100文字以内）        |

**レスポンス (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "department": "営業部",
    "created_at": "2025-12-18T21:00:00Z",
    "updated_at": "2025-12-18T21:00:00Z"
  }
}
```

**エラーレスポンス (422 Unprocessable Entity)**

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ERROR",
    "message": "このメールアドレスは既に登録されています"
  }
}
```

---

### 5.4 ユーザー更新

既存ユーザーの情報を更新します。

**エンドポイント**

```
PUT /api/users/:id
```

**認証**: 必要（上長のみ）

**パスパラメータ**

| パラメータ | 型      | 説明       |
| ---------- | ------- | ---------- |
| id         | integer | ユーザーID |

**リクエストボディ**

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "newpassword123",
  "role": "manager",
  "department": "営業1部"
}
```

**注意**: `password` は変更する場合のみ指定

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "manager",
    "department": "営業1部",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-12-18T21:30:00Z"
  }
}
```

---

### 5.5 ユーザー削除

ユーザーを削除します。

**エンドポイント**

```
DELETE /api/users/:id
```

**認証**: 必要（上長のみ）

**パスパラメータ**

| パラメータ | 型      | 説明       |
| ---------- | ------- | ---------- |
| id         | integer | ユーザーID |

**レスポンス (204 No Content)**

レスポンスボディなし

**エラーレスポンス (422 Unprocessable Entity)**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "このユーザーは日報を作成しているため削除できません"
  }
}
```

---

## 6. ダッシュボード API

### 6.1 ダッシュボード情報取得

ダッシュボード表示に必要な情報を取得します。

**エンドポイント**

```
GET /api/dashboard
```

**認証**: 必要

**レスポンス (200 OK)**

#### 営業ユーザーの場合

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
      },
      {
        "id": 2,
        "report_date": "2025-12-17",
        "visit_count": 2,
        "comment_count": 0
      }
    ]
  }
}
```

#### 上長の場合

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
      },
      {
        "id": 11,
        "user": {
          "id": 2,
          "name": "佐藤花子"
        },
        "report_date": "2025-12-18",
        "visit_count": 3,
        "comment_count": 0
      }
    ]
  }
}
```

---

## 7. 統計 API（将来拡張用）

### 7.1 訪問統計取得

訪問件数の統計情報を取得します。

**エンドポイント**

```
GET /api/statistics/visits
```

**認証**: 必要（上長のみ）

**クエリパラメータ**

| パラメータ | 型      | 必須 | 説明       | デフォルト値 |
| ---------- | ------- | ---- | ---------- | ------------ |
| user_id    | integer | -    | ユーザーID | -            |
| date_from  | date    | -    | 開始日     | 当月1日      |
| date_to    | date    | -    | 終了日     | 本日         |

**レスポンス (200 OK)**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_visits": 50,
      "average_visits_per_day": 2.5,
      "total_customers": 20
    },
    "daily_visits": [
      {
        "date": "2025-12-01",
        "visit_count": 3
      },
      {
        "date": "2025-12-02",
        "visit_count": 2
      }
    ]
  }
}
```

---

## 付録

### A. レート制限

API呼び出しには以下のレート制限があります:

| エンドポイント | 制限                |
| -------------- | ------------------- |
| 全般           | 1000リクエスト/時間 |
| ログイン       | 10リクエスト/分     |

レート制限を超えた場合、`429 Too Many Requests` が返されます。

**レスポンスヘッダー**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

---

### B. CORS設定

以下のオリジンからのアクセスを許可します:

- `https://app.example.com`
- `http://localhost:3000` (開発環境のみ)

---

### C. バージョニング

APIのバージョンはURLに含まれます: `/v1/`

メジャーバージョンアップ時は新しいバージョンのエンドポイントを提供し、旧バージョンは最低6ヶ月間サポートされます。

---

### D. データ型定義

#### Role（役割）

```
sales   : 営業
manager : 上長
```

#### CommentType（コメント種別）

```
problem : 課題・相談へのコメント
plan    : 明日やることへのコメント
general : 一般コメント
```

---

### E. セキュリティ

#### 推奨事項

- HTTPS通信の使用必須
- JWTトークンは安全に保存（LocalStorageではなくhttpOnlyクッキー推奨）
- トークンの定期的な更新
- CSRFトークンの使用

#### トークンの有効期限

- アクセストークン: 1時間
- リフレッシュトークン: 7日間

---

## 改訂履歴

| バージョン | 日付       | 変更内容 |
| ---------- | ---------- | -------- |
| 1.0.0      | 2025-12-18 | 初版作成 |
