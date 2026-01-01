'use client'

/**
 * メインレイアウトコンポーネント
 * ヘッダー、ナビゲーション、コンテンツエリアを含むアプリケーションの基本レイアウト
 */

import React, { useState, useEffect } from 'react'
import { Header } from './header'
import { Navigation } from './navigation'
import { cn } from '@/lib/utils'

export interface MainLayoutProps {
  /** コンテンツエリアに表示する要素 */
  children: React.ReactNode
  /** コンテナの最大幅を制限するかどうか */
  maxWidth?: boolean
}

/**
 * メインレイアウトコンポーネント
 */
export function MainLayout({ children, maxWidth = true }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  // モバイルメニューが開いているときにbodyのスクロールを防ぐ
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <Header onMenuClick={handleMobileMenuToggle} />

      <div className="flex">
        {/* デスクトップサイドバー */}
        <aside className="hidden w-64 border-r bg-background md:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            <Navigation />
          </div>
        </aside>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <>
            {/* オーバーレイ */}
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={handleMobileMenuClose}
              aria-hidden="true"
            />
            {/* サイドバー */}
            <aside
              className="fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-64 border-r bg-background md:hidden"
              role="navigation"
              aria-label="モバイルナビゲーション"
            >
              <div className="h-full overflow-y-auto">
                <Navigation isMobile onNavigate={handleMobileMenuClose} />
              </div>
            </aside>
          </>
        )}

        {/* メインコンテンツ */}
        <main className="flex-1">
          <div
            className={cn(
              'min-h-[calc(100vh-3.5rem)] p-4 md:p-6 lg:p-8',
              maxWidth && 'mx-auto max-w-7xl'
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
