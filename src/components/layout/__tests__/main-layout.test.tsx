import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainLayout } from '../main-layout'
import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'

// useAuthフックをモック
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

// next/navigationをモック
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        name: '山田太郎',
        email: 'yamada@example.com',
        role: 'sales',
        department: '営業部',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('子要素が正しくレンダリングされる', () => {
    render(
      <MainLayout>
        <div>テストコンテンツ</div>
      </MainLayout>
    )

    expect(screen.getByText('テストコンテンツ')).toBeInTheDocument()
  })

  it('ヘッダーが表示される', () => {
    render(
      <MainLayout>
        <div>コンテンツ</div>
      </MainLayout>
    )

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('営業日報システム')).toBeInTheDocument()
  })

  it('ナビゲーションが表示される（デスクトップ）', () => {
    render(
      <MainLayout>
        <div>コンテンツ</div>
      </MainLayout>
    )

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    expect(within(nav).getByText('ダッシュボード')).toBeInTheDocument()
  })

  it('メインコンテンツエリアが表示される', () => {
    render(
      <MainLayout>
        <div data-testid="content">メインコンテンツ</div>
      </MainLayout>
    )

    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(within(main).getByTestId('content')).toBeInTheDocument()
  })

  it('maxWidth=trueの場合、コンテンツに最大幅が適用される', () => {
    render(
      <MainLayout maxWidth={true}>
        <div>コンテンツ</div>
      </MainLayout>
    )

    const main = screen.getByRole('main')
    const container = main.firstChild as HTMLElement
    expect(container.className).toContain('max-w-7xl')
  })

  it('maxWidth=falseの場合、コンテンツに最大幅が適用されない', () => {
    render(
      <MainLayout maxWidth={false}>
        <div>コンテンツ</div>
      </MainLayout>
    )

    const main = screen.getByRole('main')
    const container = main.firstChild as HTMLElement
    expect(container.className).not.toContain('max-w-7xl')
  })

  it('デフォルトでmaxWidth=trueが適用される', () => {
    render(
      <MainLayout>
        <div>コンテンツ</div>
      </MainLayout>
    )

    const main = screen.getByRole('main')
    const container = main.firstChild as HTMLElement
    expect(container.className).toContain('max-w-7xl')
  })

  it('モバイルメニューボタンが表示される', () => {
    render(
      <MainLayout>
        <div>コンテンツ</div>
      </MainLayout>
    )

    expect(screen.getByRole('button', { name: 'メニューを開く' })).toBeInTheDocument()
  })

  it('モバイルメニューボタンをクリックするとモバイルメニューが開く', async () => {
    const user = userEvent.setup()
    render(
      <MainLayout>
        <div>コンテンツ</div>
      </MainLayout>
    )

    const menuButton = screen.getByRole('button', { name: 'メニューを開く' })

    // 初期状態ではモバイルナビゲーションが表示されていない
    expect(screen.queryByLabelText('モバイルナビゲーション')).not.toBeInTheDocument()

    await user.click(menuButton)

    // モバイルナビゲーションが表示される
    expect(screen.getByLabelText('モバイルナビゲーション')).toBeInTheDocument()
  })

  describe('レスポンシブ動作', () => {
    it('デスクトップではサイドバーが表示される', () => {
      render(
        <MainLayout>
          <div>コンテンツ</div>
        </MainLayout>
      )

      const aside = document.querySelector('aside')
      expect(aside).toBeInTheDocument()
      expect(aside?.className).toContain('md:block')
    })

    it('モバイルではサイドバーが隠される', () => {
      render(
        <MainLayout>
          <div>コンテンツ</div>
        </MainLayout>
      )

      const aside = document.querySelector('aside')
      expect(aside?.className).toContain('hidden')
    })
  })

  describe('複数の子要素', () => {
    it('複数の子要素が正しくレンダリングされる', () => {
      render(
        <MainLayout>
          <h1>タイトル</h1>
          <p>段落1</p>
          <p>段落2</p>
        </MainLayout>
      )

      expect(screen.getByText('タイトル')).toBeInTheDocument()
      expect(screen.getByText('段落1')).toBeInTheDocument()
      expect(screen.getByText('段落2')).toBeInTheDocument()
    })

    it('ネストされたコンポーネントが正しくレンダリングされる', () => {
      const NestedComponent = () => (
        <div>
          <h2>ネストされたタイトル</h2>
          <div>ネストされたコンテンツ</div>
        </div>
      )

      render(
        <MainLayout>
          <NestedComponent />
        </MainLayout>
      )

      expect(screen.getByText('ネストされたタイトル')).toBeInTheDocument()
      expect(screen.getByText('ネストされたコンテンツ')).toBeInTheDocument()
    })
  })

  describe('ユーザーロールの統合', () => {
    it('営業ユーザーの場合、ユーザー管理メニューが表示されない', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: 1,
          name: '山田太郎',
          email: 'yamada@example.com',
          role: 'sales',
          department: '営業部',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      })

      render(
        <MainLayout>
          <div>コンテンツ</div>
        </MainLayout>
      )

      const nav = screen.getByRole('navigation')
      expect(within(nav).queryByText('ユーザー管理')).not.toBeInTheDocument()
    })

    it('上長ユーザーの場合、ユーザー管理メニューが表示される', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: 2,
          name: '佐藤花子',
          email: 'sato@example.com',
          role: 'manager',
          department: '営業部',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      })

      render(
        <MainLayout>
          <div>コンテンツ</div>
        </MainLayout>
      )

      const nav = screen.getByRole('navigation')
      expect(within(nav).getByText('ユーザー管理')).toBeInTheDocument()
    })
  })

  describe('構造とレイアウト', () => {
    it('正しい階層構造でレンダリングされる', () => {
      render(
        <MainLayout>
          <div data-testid="content">コンテンツ</div>
        </MainLayout>
      )

      // ヘッダー > サイドバー/メイン の構造を確認
      const header = screen.getByRole('banner')
      const main = screen.getByRole('main')
      const aside = document.querySelector('aside')

      expect(header).toBeInTheDocument()
      expect(aside).toBeInTheDocument()
      expect(main).toBeInTheDocument()
    })

    it('min-h-screenクラスが適用されている', () => {
      const { container } = render(
        <MainLayout>
          <div>コンテンツ</div>
        </MainLayout>
      )

      const layoutRoot = container.firstChild as HTMLElement
      expect(layoutRoot.className).toContain('min-h-screen')
    })
  })
})
