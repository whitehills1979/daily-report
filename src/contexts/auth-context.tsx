'use client'

/**
 * 認証コンテキスト
 * ユーザー情報とトークンの状態管理、ログイン・ログアウト処理を提供
 */

import React, { createContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoginResponse } from '@/schemas/auth'
import { setToken, removeToken, getToken } from '@/lib/api-client'
import { post } from '@/lib/api-client'

/**
 * ユーザー情報の型
 */
export interface User {
  id: number
  name: string
  email: string
  role: 'sales' | 'manager'
  department: string | null
}

/**
 * 認証コンテキストの型
 */
export interface AuthContextType {
  /** 現在のユーザー */
  user: User | null
  /** ログイン中かどうか */
  isAuthenticated: boolean
  /** ローディング中かどうか */
  isLoading: boolean
  /** ログイン処理 */
  login: (email: string, password: string) => Promise<void>
  /** ログアウト処理 */
  logout: () => Promise<void>
}

/**
 * 認証コンテキスト
 */
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
)

/**
 * 認証プロバイダーのProps
 */
export interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * 認証プロバイダー
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  /**
   * トークンからユーザー情報を取得
   */
  const fetchUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      // /api/auth/me エンドポイントからユーザー情報を取得
      const userData = await post<User>('/api/auth/me', undefined, {
        auth: true,
        redirect: false,
      })
      setUser(userData)
    } catch (error) {
      // トークンが無効な場合は削除
      removeToken()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 初期化時にトークンからユーザー情報を取得
   */
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  /**
   * ログイン処理
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true)

        // ログインAPI呼び出し
        const response = await post<LoginResponse>(
          '/api/auth/login',
          { email, password },
          { auth: false, redirect: false }
        )

        // トークンを保存
        setToken(response.token)

        // ユーザー情報を設定
        setUser(response.user)

        // リダイレクト先を取得
        const redirectPath =
          localStorage.getItem('redirect_after_login') || '/dashboard'
        localStorage.removeItem('redirect_after_login')

        // ダッシュボードにリダイレクト
        router.push(redirectPath)
      } catch (error) {
        // エラーは呼び出し元で処理
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [router]
  )

  /**
   * ログアウト処理
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true)

      // ログアウトAPI呼び出し（エラーは無視）
      try {
        await post('/api/auth/logout', undefined, {
          auth: true,
          redirect: false,
        })
      } catch (error) {
        // ログアウトAPIのエラーは無視
        console.error('Logout API error:', error)
      }

      // トークンを削除
      removeToken()

      // ユーザー情報をクリア
      setUser(null)

      // ログイン画面にリダイレクト
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
