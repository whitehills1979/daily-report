import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ProtectedRoute } from '../protected-route'
import { AuthContext, AuthContextType } from '@/contexts/auth-context'
import React from 'react'

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

// window.location.pathnameのモック
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/dashboard',
  },
  writable: true,
})

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockPush.mockClear()
    localStorageMock.clear()
    window.location.pathname = '/dashboard'
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      const mockAuthContext: AuthContextType = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // ローディングスピナーが表示される
      expect(screen.getByRole('status')).toBeInTheDocument()
      // 保護されたコンテンツは表示されない
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Unauthenticated User', () => {
    it('should redirect to login when not authenticated', async () => {
      const mockAuthContext: AuthContextType = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // ログイン画面にリダイレクトされる
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      // 保護されたコンテンツは表示されない
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('should save current path before redirecting to login', async () => {
      window.location.pathname = '/reports/123'

      const mockAuthContext: AuthContextType = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      // 現在のパスが保存される
      expect(localStorage.getItem('redirect_after_login')).toBe('/reports/123')
    })

    it('should not save login path when already on login page', async () => {
      window.location.pathname = '/login'

      const mockAuthContext: AuthContextType = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      // ログインパスは保存されない
      expect(localStorage.getItem('redirect_after_login')).toBeNull()
    })
  })

  describe('Authenticated User', () => {
    it('should render children when authenticated', () => {
      const mockAuthContext: AuthContextType = {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'sales',
          department: null,
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // 保護されたコンテンツが表示される
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      // リダイレクトされない
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should allow sales role to access without role restriction', () => {
      const mockAuthContext: AuthContextType = {
        user: {
          id: 1,
          name: 'Sales User',
          email: 'sales@example.com',
          role: 'sales',
          department: 'Sales',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should allow manager role to access without role restriction', () => {
      const mockAuthContext: AuthContextType = {
        user: {
          id: 2,
          name: 'Manager User',
          email: 'manager@example.com',
          role: 'manager',
          department: 'Management',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('Role-based Access Control', () => {
    it('should allow manager to access manager-only route', () => {
      const mockAuthContext: AuthContextType = {
        user: {
          id: 2,
          name: 'Manager User',
          email: 'manager@example.com',
          role: 'manager',
          department: 'Management',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute requiredRole="manager">
            <div>Manager Only Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      expect(screen.getByText('Manager Only Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should redirect sales user from manager-only route', async () => {
      const mockAuthContext: AuthContextType = {
        user: {
          id: 1,
          name: 'Sales User',
          email: 'sales@example.com',
          role: 'sales',
          department: 'Sales',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute requiredRole="manager">
            <div>Manager Only Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // ダッシュボードにリダイレクトされる
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      // 保護されたコンテンツは表示されない
      expect(
        screen.queryByText('Manager Only Content')
      ).not.toBeInTheDocument()
    })

    it('should allow sales user to access sales-only route', () => {
      const mockAuthContext: AuthContextType = {
        user: {
          id: 1,
          name: 'Sales User',
          email: 'sales@example.com',
          role: 'sales',
          department: 'Sales',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute requiredRole="sales">
            <div>Sales Only Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      expect(screen.getByText('Sales Only Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should redirect manager from sales-only route', async () => {
      const mockAuthContext: AuthContextType = {
        user: {
          id: 2,
          name: 'Manager User',
          email: 'manager@example.com',
          role: 'manager',
          department: 'Management',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute requiredRole="sales">
            <div>Sales Only Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      expect(screen.queryByText('Sales Only Content')).not.toBeInTheDocument()
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle transition from loading to authenticated', async () => {
      const mockAuthContext: AuthContextType = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        logout: vi.fn(),
      }

      const { rerender } = render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // 初期状態はローディング
      expect(screen.getByRole('status')).toBeInTheDocument()

      // 認証完了後の状態
      const authenticatedContext: AuthContextType = {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'sales',
          department: null,
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      rerender(
        <AuthContext.Provider value={authenticatedContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // コンテンツが表示される
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('should handle transition from loading to unauthenticated', async () => {
      const mockAuthContext: AuthContextType = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        logout: vi.fn(),
      }

      const { rerender } = render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // 初期状態はローディング
      expect(screen.getByRole('status')).toBeInTheDocument()

      // 認証失敗後の状態
      const unauthenticatedContext: AuthContextType = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      }

      rerender(
        <AuthContext.Provider value={unauthenticatedContext}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      )

      // リダイレクトされる
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })
})
