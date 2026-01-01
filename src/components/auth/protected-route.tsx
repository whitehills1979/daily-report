'use client'

/**
 * ProtectedRoute コンポーネント
 * 認証が必要なルートを保護し、未認証の場合はログイン画面にリダイレクト
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

/**
 * ProtectedRouteのProps
 */
export interface ProtectedRouteProps {
  /** 子要素 */
  children: React.ReactNode
  /** 必要な権限（オプション） */
  requiredRole?: 'sales' | 'manager'
}

/**
 * 認証保護されたルートコンポーネント
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 *
 * @example
 * ```tsx
 * <ProtectedRoute requiredRole="manager">
 *   <AdminPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // ローディング中は何もしない
    if (isLoading) {
      return
    }

    // 未認証の場合はログイン画面にリダイレクト
    if (!isAuthenticated) {
      // 現在のパスを保存
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        localStorage.setItem('redirect_after_login', currentPath)
      }
      router.push('/login')
      return
    }

    // 権限チェック
    if (requiredRole && user?.role !== requiredRole) {
      // 権限がない場合はダッシュボードにリダイレクト
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, user?.role, requiredRole, router])

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // 未認証または権限不足の場合は何も表示しない（リダイレクト中）
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null
  }

  // 認証済みの場合は子要素を表示
  return <>{children}</>
}
