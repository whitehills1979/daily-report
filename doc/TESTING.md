# テスト仕様書

## テスト環境

### 使用ライブラリ

- **Vitest**: テストランナー（v2.1.9）
- **@testing-library/react**: Reactコンポーネントのテスト
- **@testing-library/jest-dom**: DOM用カスタムマッチャー
- **@testing-library/user-event**: ユーザーインタラクションのシミュレーション
- **jsdom**: DOM環境のシミュレーション

## テストコマンド

```bash
# テストをwatchモードで実行（ファイル変更を監視）
npm test

# テストを1回だけ実行
npm run test:run

# UIモードでテストを実行
npm run test:ui

# カバレッジレポートを生成
npm run test:coverage
```

## テストファイルの配置

テストファイルは `__tests__` ディレクトリに配置します：

```
src/
  components/
    Button.tsx
    __tests__/
      Button.test.tsx
  lib/
    utils.ts
    __tests__/
      utils.test.ts
```

## テストファイルの命名規則

- `*.test.ts` - ユーティリティ関数のテスト
- `*.test.tsx` - Reactコンポーネントのテスト
- `*.spec.ts` / `*.spec.tsx` - 仕様書的なテスト

## テストの書き方

### 基本的なテスト構造

```typescript
import { describe, it, expect } from 'vitest'

describe('機能名', () => {
  it('期待される動作を記述', () => {
    // Arrange（準備）
    const input = 'test'

    // Act（実行）
    const result = someFunction(input)

    // Assert（検証）
    expect(result).toBe('expected')
  })
})
```

### コンポーネントのテスト例

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('クリック時にonClickが呼ばれる', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>クリック</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## カバレッジ目標

- **ステートメントカバレッジ**: 80%以上
- **ブランチカバレッジ**: 75%以上
- **関数カバレッジ**: 80%以上
- **ラインカバレッジ**: 80%以上

## テスト戦略

### 単体テスト（Unit Test）

- ユーティリティ関数
- カスタムフック
- 個別のコンポーネント

### 統合テスト（Integration Test）

- 複数のコンポーネントの連携
- APIとの通信
- フォームの送信フロー

### E2Eテスト

※将来的にPlaywrightまたはCypressの導入を検討

## テストのベストプラクティス

1. **テストは独立させる**: 各テストは他のテストに依存しない
2. **明確なテスト名**: 何をテストしているか一目で分かる名前をつける
3. **AAA パターン**: Arrange（準備）、Act（実行）、Assert（検証）
4. **モックは最小限**: 本物のコードをできるだけ使用する
5. **境界値テスト**: 正常系だけでなく、異常系もテストする

## よく使うマッチャー

```typescript
// 等価性
expect(value).toBe(expected) // 厳密等価（===）
expect(value).toEqual(expected) // 深い等価

// 真偽値
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()

// 数値
expect(value).toBeGreaterThan(3)
expect(value).toBeGreaterThanOrEqual(3.5)
expect(value).toBeLessThan(5)

// 文字列
expect(value).toMatch(/pattern/)
expect(value).toContain('substring')

// 配列
expect(array).toContain(item)
expect(array).toHaveLength(3)

// オブジェクト
expect(object).toHaveProperty('key')
expect(object).toMatchObject({ key: 'value' })

// DOM（@testing-library/jest-dom）
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveTextContent('text')
expect(element).toHaveClass('className')
```

## トラブルシューティング

### テストがタイムアウトする

```typescript
it(
  'テスト名',
  async () => {
    // テストコード
  },
  { timeout: 10000 }
) // 10秒に設定
```

### モックの使い方

```typescript
import { vi } from 'vitest'

// 関数のモック
const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')

// モジュールのモック
vi.mock('./module', () => ({
  someFunction: vi.fn(() => 'mocked'),
}))
```
