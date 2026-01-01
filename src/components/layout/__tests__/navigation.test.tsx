import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigation } from '../navigation'
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

describe('Navigation', () => {
  const mockOnNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePathname).mockReturnValue('/dashboard')
  })

  describe('営業ユーザー', () => {
    beforeEach(() => {
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

    it('営業ユーザー用のメニュー項目が表示される', () => {
      render(<Navigation />)

      expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
      expect(screen.getByText('日報一覧')).toBeInTheDocument()
      expect(screen.getByText('日報作成')).toBeInTheDocument()
      expect(screen.getByText('顧客一覧')).toBeInTheDocument()
      expect(screen.getByText('顧客登録')).toBeInTheDocument()
    })

    it('営業ユーザーにはユーザー管理メニューが表示されない', () => {
      render(<Navigation />)

      expect(screen.queryByText('ユーザー管理')).not.toBeInTheDocument()
    })

    it('各メニュー項目が正しいリンクを持つ', () => {
      render(<Navigation />)

      expect(screen.getByRole('link', { name: /ダッシュボード/i })).toHaveAttribute(
        'href',
        '/dashboard'
      )
      expect(screen.getByRole('link', { name: /日報一覧/i })).toHaveAttribute(
        'href',
        '/daily-reports'
      )
      expect(screen.getByRole('link', { name: /日報作成/i })).toHaveAttribute(
        'href',
        '/daily-reports/new'
      )
      expect(screen.getByRole('link', { name: /顧客一覧/i })).toHaveAttribute(
        'href',
        '/customers'
      )
      expect(screen.getByRole('link', { name: /顧客登録/i })).toHaveAttribute(
        'href',
        '/customers/new'
      )
    })

    it('現在のパスに対応するメニュー項目がアクティブになる', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<Navigation />)

      const activeLink = screen.getByRole('link', { name: /ダッシュボード/i })
      expect(activeLink).toHaveAttribute('aria-current', 'page')
      expect(activeLink.className).toContain('bg-primary')
    })

    it('サブパスでもアクティブ判定される', () => {
      vi.mocked(usePathname).mockReturnValue('/daily-reports/123')
      render(<Navigation />)

      const activeLink = screen.getByRole('link', { name: /日報一覧/i })
      expect(activeLink).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('上長ユーザー', () => {
    beforeEach(() => {
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
    })

    it('上長ユーザー用のすべてのメニュー項目が表示される', () => {
      render(<Navigation />)

      expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
      expect(screen.getByText('日報一覧')).toBeInTheDocument()
      expect(screen.getByText('日報作成')).toBeInTheDocument()
      expect(screen.getByText('顧客一覧')).toBeInTheDocument()
      expect(screen.getByText('顧客登録')).toBeInTheDocument()
      expect(screen.getByText('ユーザー管理')).toBeInTheDocument()
    })

    it('ユーザー管理メニューが正しいリンクを持つ', () => {
      render(<Navigation />)

      expect(screen.getByRole('link', { name: /ユーザー管理/i })).toHaveAttribute(
        'href',
        '/users'
      )
    })
  })

  describe('モバイルモード', () => {
    beforeEach(() => {
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

    it('モバイルモードで正しくレンダリングされる', () => {
      render(<Navigation isMobile />)

      expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
    })

    it('メニュー項目をクリックするとonNavigateが呼ばれる', async () => {
      const user = userEvent.setup()
      render(<Navigation isMobile onNavigate={mockOnNavigate} />)

      const dashboardLink = screen.getByRole('link', { name: /ダッシュボード/i })
      await user.click(dashboardLink)

      expect(mockOnNavigate).toHaveBeenCalledTimes(1)
    })

    it('複数のメニュー項目をクリックすると、それぞれonNavigateが呼ばれる', async () => {
      const user = userEvent.setup()
      render(<Navigation isMobile onNavigate={mockOnNavigate} />)

      await user.click(screen.getByRole('link', { name: /ダッシュボード/i }))
      await user.click(screen.getByRole('link', { name: /日報一覧/i }))

      expect(mockOnNavigate).toHaveBeenCalledTimes(2)
    })
  })

  describe('ユーザーが未認証', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      })
    })

    it('ユーザー管理メニューが表示されない（roleがnull）', () => {
      render(<Navigation />)

      expect(screen.queryByText('ユーザー管理')).not.toBeInTheDocument()
    })

    it('基本メニューは表示される', () => {
      render(<Navigation />)

      expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
      expect(screen.getByText('日報一覧')).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    beforeEach(() => {
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

    it('navタグにaria-labelが設定されている', () => {
      render(<Navigation />)

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'メインナビゲーション')
    })

    it('アクティブなリンクにaria-current="page"が設定される', () => {
      vi.mocked(usePathname).mockReturnValue('/customers')
      render(<Navigation />)

      const activeLink = screen.getByRole('link', { name: /顧客一覧/i })
      expect(activeLink).toHaveAttribute('aria-current', 'page')
    })
  })
})
