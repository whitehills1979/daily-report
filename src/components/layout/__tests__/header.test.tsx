import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '../header'
import { useAuth } from '@/hooks/use-auth'

// useAuthフックをモック
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

describe('Header', () => {
  const mockLogout = vi.fn()
  const mockOnMenuClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ロゴが正しく表示される', () => {
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
      logout: mockLogout,
    })

    render(<Header />)
    expect(screen.getByText('営業日報システム')).toBeInTheDocument()
  })

  it('ユーザー名が表示される（デスクトップ）', () => {
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
      logout: mockLogout,
    })

    render(<Header />)
    expect(screen.getByText('山田太郎')).toBeInTheDocument()
  })

  it('ユーザーのイニシャルがアバターに表示される', () => {
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
      logout: mockLogout,
    })

    render(<Header />)
    // 日本語名の場合、最初の1文字が表示される
    expect(screen.getByText('山')).toBeInTheDocument()
  })

  it('ドロップダウンメニューを開いて、ユーザー情報が表示される', async () => {
    const user = userEvent.setup()
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
      logout: mockLogout,
    })

    render(<Header />)

    // ドロップダウンをクリック
    const dropdownTrigger = screen.getByRole('button', { name: /山田太郎/i })
    await user.click(dropdownTrigger)

    // メニュー内のユーザー情報が表示される
    await waitFor(() => {
      expect(screen.getAllByText('yamada@example.com')[0]).toBeInTheDocument()
      expect(screen.getByText('営業')).toBeInTheDocument()
    })
  })

  it('上長ロールの場合、"上長"と表示される', async () => {
    const user = userEvent.setup()
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
      logout: mockLogout,
    })

    render(<Header />)

    const dropdownTrigger = screen.getByRole('button', { name: /佐藤花子/i })
    await user.click(dropdownTrigger)

    await waitFor(() => {
      expect(screen.getByText('上長')).toBeInTheDocument()
    })
  })

  it('ログアウトボタンをクリックするとlogout関数が呼ばれる', async () => {
    const user = userEvent.setup()
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
      logout: mockLogout,
    })

    render(<Header />)

    // ドロップダウンを開く
    const dropdownTrigger = screen.getByRole('button', { name: /山田太郎/i })
    await user.click(dropdownTrigger)

    // ログアウトをクリック
    const logoutButton = await screen.findByRole('menuitem', { name: /ログアウト/i })
    await user.click(logoutButton)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  it('モバイルメニューボタンをクリックするとonMenuClickが呼ばれる', async () => {
    const user = userEvent.setup()
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
      logout: mockLogout,
    })

    render(<Header onMenuClick={mockOnMenuClick} />)

    const menuButton = screen.getByRole('button', { name: 'メニューを開く' })
    await user.click(menuButton)

    expect(mockOnMenuClick).toHaveBeenCalledTimes(1)
  })

  it('ローディング中はユーザーメニューが表示されない', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: mockLogout,
    })

    render(<Header />)

    // ユーザー名が表示されていないことを確認
    expect(screen.queryByText('山田太郎')).not.toBeInTheDocument()
  })

  it('未認証の場合はユーザーメニューが表示されない', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: mockLogout,
    })

    render(<Header />)

    // ユーザー名が表示されていないことを確認
    expect(screen.queryByText('山田太郎')).not.toBeInTheDocument()
  })

  it('プロフィールリンクが正しいhrefを持つ', async () => {
    const user = userEvent.setup()
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
      logout: mockLogout,
    })

    render(<Header />)

    const dropdownTrigger = screen.getByRole('button', { name: /山田太郎/i })
    await user.click(dropdownTrigger)

    const profileLink = await screen.findByRole('menuitem', { name: /プロフィール/i })
    expect(profileLink).toHaveAttribute('href', '/profile')
  })
})
