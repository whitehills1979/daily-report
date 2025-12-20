# 営業日報システム

営業担当者が日々の営業活動を報告し、上長が確認・コメントできる日報管理システム

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: Next.js (App Router)
- **UIコンポーネント**: shadcn/ui + Tailwind CSS
- **APIスキーマ定義**: OpenAPI (Zod による検証)
- **DBスキーマ定義**: Prisma.js
- **テスト**: Vitest
- **デプロイ**: Google Cloud Run

## 開発環境セットアップ

### 必要な環境

- Node.js 20.x 以上
- npm 10.x 以上

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd daily-report

# 依存関係のインストール
npm install
```

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認できます。

### ビルド

```bash
npm run build
```

### 本番サーバーの起動

```bash
npm start
```

## コード品質管理

### Lint

```bash
# ESLint チェック
npm run lint

# ESLint 自動修正
npm run lint:fix
```

### フォーマット

```bash
# Prettier でフォーマット
npm run format

# フォーマットチェック
npm run format:check
```

### 型チェック

```bash
npm run type-check
```

## テスト

```bash
# Watch モードでテスト実行
npm test

# テストを1回だけ実行
npm run test:run

# UI モードでテスト実行
npm run test:ui

# カバレッジレポート生成
npm run test:coverage
```

詳細は [doc/TESTING.md](./doc/TESTING.md) を参照してください。

## Git Hooks

コミット時とプッシュ時に自動的にチェックが実行されます：

- **pre-commit**: ESLint + Prettier (ステージングされたファイルのみ)
- **pre-push**: TypeScript 型チェック + テスト実行

詳細は [doc/GIT_HOOKS.md](./doc/GIT_HOOKS.md) を参照してください。

## データベース

### Prisma

```bash
# Prisma Client の生成
npm run prisma:generate

# Prisma Studio の起動（DB GUI）
npm run prisma:studio
```

## デプロイ

### ローカルからのデプロイ

```bash
# 初回セットアップ
make gcloud-auth
make gcloud-configure-docker

# デプロイ（品質チェック + ビルド + デプロイ）
make deploy

# ログ確認
make logs

# サービスURL取得
make url
```

### Makefileコマンド

```bash
make help              # コマンド一覧を表示
make deploy            # フルデプロイ（品質チェック付き）
make deploy-force      # 強制デプロイ（品質チェックなし）
make docker-build      # Dockerイメージビルド
make docker-run        # ローカルでDockerコンテナ起動
make logs              # Cloud Runログ表示
make logs-tail         # Cloud Runログをリアルタイム表示
make status            # サービスステータス確認
```

詳細は [doc/DEPLOYMENT.md](./doc/DEPLOYMENT.md) を参照してください。

### CI/CD

- **CI**: Pull Request時に自動的に品質チェックとビルドを実行
- **CD**: main/masterブランチへのpush時に自動的にCloud Runへデプロイ

## ドキュメント

- [CLAUDE.md](./CLAUDE.md) - プロジェクト要件定義
- [doc/ER_DESIGN.md](./doc/ER_DESIGN.md) - ER図・テーブル詳細仕様
- [doc/SCREEN_DESIGN.md](./doc/SCREEN_DESIGN.md) - 画面設計
- [doc/API_SPECIFICATION.md](./doc/API_SPECIFICATION.md) - API仕様書
- [doc/TESTING.md](./doc/TESTING.md) - テスト仕様書
- [doc/TEST_SPECIFICATION.md](./doc/TEST_SPECIFICATION.md) - テスト計画
- [doc/GIT_HOOKS.md](./doc/GIT_HOOKS.md) - Git Hooks 設定
- [doc/DEPLOYMENT.md](./doc/DEPLOYMENT.md) - デプロイメントガイド

## プロジェクト構造

```
daily-report/
├── .husky/              # Git Hooks
├── .vscode/             # VSCode 設定
├── doc/                 # ドキュメント
├── src/
│   ├── app/            # Next.js App Router
│   ├── components/     # React コンポーネント
│   ├── lib/            # ユーティリティ関数
│   ├── types/          # TypeScript 型定義
│   └── test/           # テスト設定
├── CLAUDE.md           # プロジェクト要件
├── package.json
└── README.md
```

## VSCode 拡張機能

以下の拡張機能のインストールを推奨します（.vscode/extensions.json に記載）：

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma
- Vitest

## 開発ワークフロー

1. 機能ブランチを作成

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. コードを書く

3. テストを書く

4. コミット（自動的に lint と format が実行されます）

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. プッシュ（自動的に型チェックとテストが実行されます）
   ```bash
   git push origin feature/your-feature-name
   ```

## ライセンス

Private
