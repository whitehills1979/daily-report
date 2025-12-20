# デプロイメントガイド

## 概要

このプロジェクトは Google Cloud Run にデプロイされます。
CI/CD は GitHub Actions で自動化されており、main/master ブランチへのプッシュで自動デプロイされます。

## プロジェクト情報

- **プロジェクト ID**: `daily-report-481805`
- **リージョン**: `asia-northeast1` (東京)
- **サービス名**: `daily-report`
- **ポート**: `8080`

## 前提条件

### ローカル開発環境

- Docker Desktop
- Google Cloud SDK (gcloud CLI)
- Make

### Google Cloud

- Google Cloud プロジェクトが作成済み
- Cloud Run API が有効化済み
- Container Registry API が有効化済み
- 適切な権限を持つサービスアカウント

## ローカルからのデプロイ

### 1. 初回セットアップ

```bash
# Google Cloud にログイン
make gcloud-auth

# Docker を GCR 用に設定
make gcloud-configure-docker
```

### 2. デプロイ方法

#### フルデプロイ（品質チェック付き）

```bash
make deploy
```

以下が順次実行されます：

1. ESLint チェック
2. TypeScript 型チェック
3. テスト実行
4. Docker イメージのビルド
5. GCR へのプッシュ
6. Cloud Run へのデプロイ

#### 強制デプロイ（品質チェックなし）

```bash
make deploy-force
```

緊急時のみ使用してください。

### 3. Makefile コマンド一覧

```bash
# ヘルプを表示
make help

# 開発サーバー起動
make dev

# ビルド
make build

# テスト実行
make test

# 品質チェック（lint + type-check + test）
make quality-check

# Docker イメージのビルド
make docker-build

# Docker コンテナをローカルで起動
make docker-run

# Cloud Run のログを表示
make logs

# Cloud Run のログをリアルタイムで表示
make logs-tail

# サービスのステータス確認
make status

# サービスの URL を取得
make url

# サービスを削除
make delete
```

## GitHub Actions による自動デプロイ

### CI ワークフロー（.github/workflows/ci.yml）

Pull Request または push 時に自動実行：

- ESLint チェック
- Prettier チェック
- TypeScript 型チェック
- テスト実行
- カバレッジレポート生成
- Next.js ビルド

### CD ワークフロー（.github/workflows/cd.yml）

main/master ブランチへの push 時に自動実行：

1. 品質チェック
2. Docker イメージのビルド
3. GCR へのプッシュ
4. Cloud Run へのデプロイ

### GitHub Secrets の設定

以下の Secrets を GitHub リポジトリに設定する必要があります：

#### Workload Identity Federation を使用する場合（推奨）

```
GCP_WORKLOAD_IDENTITY_PROVIDER: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_NAME/providers/PROVIDER_NAME
GCP_SERVICE_ACCOUNT: service-account@PROJECT_ID.iam.gserviceaccount.com
```

#### サービスアカウントキーを使用する場合

```
GCP_PROJECT_ID: daily-report-481805
GCP_SERVICE_ACCOUNT_KEY: <JSON形式のサービスアカウントキー>
```

### Workload Identity Federation のセットアップ

1. Workload Identity Pool を作成：

```bash
gcloud iam workload-identity-pools create "github-pool" \
  --project="daily-report-481805" \
  --location="global" \
  --display-name="GitHub Pool"
```

2. GitHub Provider を作成：

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="daily-report-481805" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

3. サービスアカウントを作成：

```bash
gcloud iam service-accounts create github-actions \
  --project="daily-report-481805" \
  --display-name="GitHub Actions"
```

4. 必要な権限を付与：

```bash
# Cloud Run Admin
gcloud projects add-iam-policy-binding daily-report-481805 \
  --member="serviceAccount:github-actions@daily-report-481805.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Storage Admin (for GCR)
gcloud projects add-iam-policy-binding daily-report-481805 \
  --member="serviceAccount:github-actions@daily-report-481805.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Service Account User
gcloud projects add-iam-policy-binding daily-report-481805 \
  --member="serviceAccount:github-actions@daily-report-481805.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

5. Workload Identity バインディング：

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@daily-report-481805.iam.gserviceaccount.com \
  --project="daily-report-481805" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/daily-report"
```

## Docker について

### Dockerfile の構成

マルチステージビルドを使用：

1. **deps ステージ**: 依存関係のインストール
2. **builder ステージ**: アプリケーションのビルド
3. **runner ステージ**: 本番環境用の最小イメージ

### ローカルでの Docker ビルドとテスト

```bash
# イメージのビルド
make docker-build

# コンテナの起動
make docker-run

# ブラウザで http://localhost:8080 にアクセス
```

## Cloud Run 設定

### リソース制限

- **メモリ**: 512Mi
- **CPU**: 1
- **最小インスタンス数**: 0（コールドスタート許容）
- **最大インスタンス数**: 10

### 環境変数

- `NODE_ENV`: production
- `PORT`: 8080
- その他必要な環境変数は Cloud Run の環境変数設定で追加

### 環境変数の追加方法

#### Makefile を使用

`Makefile` の `deploy-run` ターゲットを編集：

```makefile
--set-env-vars "NODE_ENV=production,DATABASE_URL=xxx"
```

#### gcloud コマンド

```bash
gcloud run services update daily-report \
  --region asia-northeast1 \
  --set-env-vars "KEY=VALUE"
```

#### GitHub Actions

`.github/workflows/cd.yml` の deploy ステップを編集：

```yaml
--set-env-vars "NODE_ENV=production,KEY=VALUE"
```

または Secrets を使用：

```yaml
--set-env-vars "NODE_ENV=production,API_KEY=${{ secrets.API_KEY }}"
```

## トラブルシューティング

### デプロイが失敗する

1. ログを確認：

```bash
make logs
```

2. ビルドログを確認：

```bash
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### イメージのビルドが失敗する

1. ローカルでビルドを試す：

```bash
make docker-build
```

2. .dockerignore が正しく設定されているか確認

### Cloud Run でアプリケーションが起動しない

1. Dockerfile の CMD が正しいか確認
2. next.config.mjs で `output: 'standalone'` が設定されているか確認
3. ポートが 8080 に設定されているか確認

### 環境変数が反映されない

1. Cloud Run サービスの環境変数を確認：

```bash
make status
```

2. 必要に応じて更新：

```bash
gcloud run services update daily-report \
  --region asia-northeast1 \
  --set-env-vars "KEY=VALUE"
```

## ロールバック

### 以前のリビジョンにロールバック

1. リビジョン一覧を確認：

```bash
gcloud run revisions list \
  --service daily-report \
  --region asia-northeast1
```

2. 特定のリビジョンにトラフィックを向ける：

```bash
gcloud run services update-traffic daily-report \
  --region asia-northeast1 \
  --to-revisions REVISION_NAME=100
```

## モニタリング

### ログの確認

```bash
# 最新50件のログを表示
make logs

# リアルタイムでログを表示
make logs-tail
```

### Cloud Console

- [Cloud Run ダッシュボード](https://console.cloud.google.com/run?project=daily-report-481805)
- [ログエクスプローラー](https://console.cloud.google.com/logs?project=daily-report-481805)

## コスト最適化

- 最小インスタンス数を 0 に設定（コールドスタート許容）
- 適切なメモリと CPU の設定
- 不要なリビジョンの削除

```bash
# 古いリビジョンの削除
gcloud run revisions delete REVISION_NAME \
  --region asia-northeast1
```
