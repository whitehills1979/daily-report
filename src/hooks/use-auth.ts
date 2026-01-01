'use client'

/**
 * useAuth フック
 * 認証コンテキストから値を取得するカスタムフック
 */

import { useContext } from 'react'
import { AuthContext, AuthContextType } from '@/contexts/auth-context'

/**
 * 認証コンテキストを使用するフック
 * @throws {Error} AuthProvider外で使用された場合
 * @returns 認証コンテキストの値
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
