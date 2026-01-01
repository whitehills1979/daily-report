import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider } from '../auth-context'
import { useAuth } from '@/hooks/use-auth'
import * as apiClient from '@/lib/api-client'

// next/navigationのモック
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// テスト用コンポーネント
function TestComponent() {
  const { user, isAuthenticated, isLoading } = useAuth()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      {user && (
        <div data-testid="user-info">
          <div data-testid="user-name">{user.name}</div>
          <div data-testid="user-email">{user.email}</div>
          <div data-testid="user-role">{user.role}</div>
        </div>
      )}
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
    mockPush.mockClear()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should start with loading state when no token exists', async () => {
      vi.spyOn(apiClient, 'getToken').mockReturnValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 初期状態はローディング中
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')

      // ローディングが完了するのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })

      // 未認証状態
      expect(screen.getByTestId('authenticated')).toHaveTextContent(
        'Not Authenticated'
      )
    })

    it('should fetch user data when token exists', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'sales' as const,
        department: 'Sales Dept',
      }

      vi.spyOn(apiClient, 'getToken').mockReturnValue('valid-token')
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // ユーザーデータが取得されるまで待つ
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent(
          'Authenticated'
        )
      })

      // ユーザー情報が表示される
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        'test@example.com'
      )
      expect(screen.getByTestId('user-role')).toHaveTextContent('sales')
    })

    it('should handle invalid token by removing it', async () => {
      vi.spyOn(apiClient, 'getToken').mockReturnValue('invalid-token')
      vi.spyOn(apiClient, 'post').mockRejectedValue(
        new Error('Invalid token')
      )
      const removeTokenSpy = vi.spyOn(apiClient, 'removeToken')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })

      // トークンが削除される
      expect(removeTokenSpy).toHaveBeenCalled()

      // 未認証状態
      expect(screen.getByTestId('authenticated')).toHaveTextContent(
        'Not Authenticated'
      )
    })
  })

  describe('Login', () => {
    it('should login successfully and redirect to dashboard', async () => {
      const mockLoginResponse = {
        token: 'new-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'sales' as const,
          department: 'Sales Dept',
        },
      }

      vi.spyOn(apiClient, 'getToken').mockReturnValue(null)
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockLoginResponse)
      const setTokenSpy = vi.spyOn(apiClient, 'setToken')

      let loginFunction: any

      function LoginTestComponent() {
        const { login } = useAuth()
        loginFunction = login
        return <div>Login Test</div>
      }

      render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      )

      // ログイン処理を実行
      await act(async () => {
        await loginFunction('test@example.com', 'password123')
      })

      // トークンが保存される
      expect(setTokenSpy).toHaveBeenCalledWith('new-token')

      // ダッシュボードにリダイレクトされる
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should redirect to saved path after login', async () => {
      const mockLoginResponse = {
        token: 'new-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'sales' as const,
          department: null,
        },
      }

      // リダイレクト先を保存
      localStorage.setItem('redirect_after_login', '/reports/123')

      vi.spyOn(apiClient, 'getToken').mockReturnValue(null)
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockLoginResponse)

      let loginFunction: any

      function LoginTestComponent() {
        const { login } = useAuth()
        loginFunction = login
        return <div>Login Test</div>
      }

      render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await loginFunction('test@example.com', 'password123')
      })

      // 保存されたパスにリダイレクト
      expect(mockPush).toHaveBeenCalledWith('/reports/123')

      // リダイレクトパスが削除される
      expect(localStorage.getItem('redirect_after_login')).toBeNull()
    })

    it('should handle login error', async () => {
      vi.spyOn(apiClient, 'getToken').mockReturnValue(null)
      vi.spyOn(apiClient, 'post').mockRejectedValue(
        new Error('Invalid credentials')
      )

      let loginFunction: any

      function LoginTestComponent() {
        const { login } = useAuth()
        loginFunction = login
        return <div>Login Test</div>
      }

      render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      )

      // ログインエラーがスローされる
      await expect(
        act(async () => {
          await loginFunction('test@example.com', 'wrong-password')
        })
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('Logout', () => {
    it('should logout and clear user data', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'sales' as const,
        department: null,
      }

      vi.spyOn(apiClient, 'getToken').mockReturnValue('valid-token')
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockUser)
      const removeTokenSpy = vi.spyOn(apiClient, 'removeToken')

      let logoutFunction: any

      function LogoutTestComponent() {
        const { logout, user } = useAuth()
        logoutFunction = logout
        return <div>{user ? 'Logged In' : 'Logged Out'}</div>
      }

      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      )

      // ユーザーがログインするまで待つ
      await waitFor(() => {
        expect(screen.getByText('Logged In')).toBeInTheDocument()
      })

      // ログアウト
      await act(async () => {
        await logoutFunction()
      })

      // トークンが削除される
      expect(removeTokenSpy).toHaveBeenCalled()

      // ログイン画面にリダイレクト
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should handle logout API error gracefully', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'sales' as const,
        department: null,
      }

      let callCount = 0
      vi.spyOn(apiClient, 'getToken').mockReturnValue('valid-token')
      vi.spyOn(apiClient, 'post').mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // 最初の呼び出し（初期化時のユーザー取得）
          return Promise.resolve(mockUser)
        } else {
          // 2回目の呼び出し（ログアウト）
          return Promise.reject(new Error('Logout API error'))
        }
      })
      const removeTokenSpy = vi.spyOn(apiClient, 'removeToken')
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      let logoutFunction: any

      function LogoutTestComponent() {
        const { logout } = useAuth()
        logoutFunction = logout
        return <div>Test</div>
      }

      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // ログアウト（エラーが発生しても処理は継続する）
      await act(async () => {
        await logoutFunction()
      })

      // エラーがコンソールに出力される
      expect(consoleErrorSpy).toHaveBeenCalled()

      // トークンは削除される
      expect(removeTokenSpy).toHaveBeenCalled()

      // ログイン画面にリダイレクトされる
      expect(mockPush).toHaveBeenCalledWith('/login')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Role-based Access', () => {
    it('should support manager role', async () => {
      const mockManager = {
        id: 2,
        name: 'Manager User',
        email: 'manager@example.com',
        role: 'manager' as const,
        department: 'Management',
      }

      vi.spyOn(apiClient, 'getToken').mockReturnValue('manager-token')
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockManager)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-role')).toHaveTextContent('manager')
      })
    })
  })
})
