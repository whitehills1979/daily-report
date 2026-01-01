import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '../use-auth'
import { AuthProvider, AuthContext } from '@/contexts/auth-context'
import React from 'react'

// next/navigationのモック
const mockRouter = {
  push: vi.fn(),
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

describe('useAuth', () => {
  it('should throw error when used outside AuthProvider', () => {
    // コンソールエラーを抑制
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleErrorSpy.mockRestore()
  })

  it('should return auth context when used inside AuthProvider', () => {
    vi.mock('@/lib/api-client', () => ({
      getToken: () => null,
      setToken: vi.fn(),
      removeToken: vi.fn(),
      post: vi.fn(),
    }))

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    })

    // コンテキストの値が返される
    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('isAuthenticated')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('login')
    expect(result.current).toHaveProperty('logout')
  })

  it('should provide login function', () => {
    vi.mock('@/lib/api-client', () => ({
      getToken: () => null,
      setToken: vi.fn(),
      removeToken: vi.fn(),
      post: vi.fn(),
    }))

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    })

    expect(typeof result.current.login).toBe('function')
  })

  it('should provide logout function', () => {
    vi.mock('@/lib/api-client', () => ({
      getToken: () => null,
      setToken: vi.fn(),
      removeToken: vi.fn(),
      post: vi.fn(),
    }))

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    })

    expect(typeof result.current.logout).toBe('function')
  })

  it('should return user as null when not authenticated', () => {
    vi.mock('@/lib/api-client', () => ({
      getToken: () => null,
      setToken: vi.fn(),
      removeToken: vi.fn(),
      post: vi.fn(),
    }))

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should work with custom context value', () => {
    const mockContextValue = {
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'sales' as const,
        department: null,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthContext.Provider value={mockContextValue}>
          {children}
        </AuthContext.Provider>
      ),
    })

    expect(result.current.user).toEqual(mockContextValue.user)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle manager role', () => {
    const mockContextValue = {
      user: {
        id: 2,
        name: 'Manager User',
        email: 'manager@example.com',
        role: 'manager' as const,
        department: 'Management',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthContext.Provider value={mockContextValue}>
          {children}
        </AuthContext.Provider>
      ),
    })

    expect(result.current.user?.role).toBe('manager')
  })
})
