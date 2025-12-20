# Git Hooks 設定

## 概要

このプロジェクトでは、コードの品質を保つために Git Hooks を使用しています。
Husky と lint-staged を使用して、コミット前とプッシュ前に自動的にチェックを実行します。

## 使用ツール

- **Husky v9.1.7**: Git Hooks の管理
- **lint-staged v16.2.7**: ステージングされたファイルに対してコマンドを実行

## 設定されているフック

### pre-commit フック

コミット前に、ステージングされたファイルに対して以下を実行します：

**対象ファイル: `*.{js,jsx,ts,tsx}`**

- ESLint で自動修正
- Prettier でフォーマット

**対象ファイル: `*.{json,md}`**

- Prettier でフォーマット

**実行内容:**

```bash
npx lint-staged
```

**動作:**

1. ステージングされた JavaScript/TypeScript ファイルを ESLint で検査
2. 自動修正可能な問題を修正
3. Prettier でコードフォーマット
4. JSON/Markdown ファイルも Prettier でフォーマット
5. 修正されたファイルは自動的にステージングに追加

### pre-push フック

プッシュ前に、以下のチェックを実行します：

**実行内容:**

```bash
npm run type-check  # TypeScript型チェック
npm run test:run    # テスト実行
```

**動作:**

1. TypeScript の型エラーがないか確認
2. すべてのテストを実行
3. いずれかが失敗した場合、プッシュを中止

## lint-staged 設定

`package.json` に以下の設定があります：

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## フックの一時的な無効化

### 特定のコミットでフックをスキップ

```bash
git commit --no-verify -m "commit message"
# または
git commit -n -m "commit message"
```

### 特定のプッシュでフックをスキップ

```bash
git push --no-verify
# または
git push -n
```

**⚠️ 注意**: フックのスキップは緊急時のみ使用してください。

## トラブルシューティング

### フックが実行されない場合

1. Husky が正しくインストールされているか確認：

```bash
ls -la .husky
```

2. フックファイルが実行可能か確認：

```bash
ls -l .husky/pre-commit
ls -l .husky/pre-push
```

3. 必要に応じて実行権限を付与：

```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### lint-staged でエラーが発生する場合

1. ステージングされたファイルを確認：

```bash
git status
```

2. 手動で lint を実行して問題を特定：

```bash
npm run lint
npm run format
```

3. 問題を修正してから再度コミット

### pre-push でテストが失敗する場合

1. ローカルでテストを実行：

```bash
npm run test:run
```

2. 失敗したテストを修正

3. 型チェックエラーも確認：

```bash
npm run type-check
```

## フックのカスタマイズ

### pre-commit フックの編集

`.husky/pre-commit` ファイルを編集：

```bash
npx lint-staged
# 追加のコマンドをここに記述
```

### pre-push フックの編集

`.husky/pre-push` ファイルを編集：

```bash
npm run type-check
npm run test:run
# 追加のコマンドをここに記述
```

### lint-staged 設定の変更

`package.json` の `lint-staged` セクションを編集：

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
      // 追加のコマンド
    ]
  }
}
```

## ベストプラクティス

1. **小さく頻繁にコミット**: フックの実行時間を短くするため
2. **事前チェック**: コミット前に手動で lint とテストを実行
3. **フックのスキップは最小限に**: 品質を保つため
4. **チーム全体で同じ設定**: .husky ディレクトリもコミット

## 新しいメンバーのセットアップ

リポジトリをクローンした後、自動的に Husky がインストールされます：

```bash
git clone <repository-url>
cd daily-report
npm install  # prepare スクリプトで husky がセットアップされる
```

`package.json` の `prepare` スクリプトが自動的に Husky をセットアップします：

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```
