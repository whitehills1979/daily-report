'use client'

/**
 * ナビゲーションコンポーネント
 * アプリケーションのメインナビゲーションメニュー
 * ユーザーのロールに応じてメニュー項目を表示
 */

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ClipboardList,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

export interface NavigationProps {
  /** モバイル表示かどうか */
  isMobile?: boolean
  /** メニューを閉じるコールバック（モバイル用） */
  onNavigate?: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('sales' | 'manager')[]
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'ダッシュボード',
    icon: LayoutDashboard,
  },
  {
    href: '/daily-reports',
    label: '日報一覧',
    icon: FileText,
  },
  {
    href: '/daily-reports/new',
    label: '日報作成',
    icon: ClipboardList,
  },
  {
    href: '/customers',
    label: '顧客一覧',
    icon: Users,
  },
  {
    href: '/customers/new',
    label: '顧客登録',
    icon: UserPlus,
  },
  {
    href: '/users',
    label: 'ユーザー管理',
    icon: Settings,
    roles: ['manager'],
  },
]

/**
 * ナビゲーションコンポーネント
 */
export function Navigation({ isMobile = false, onNavigate }: NavigationProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  // ユーザーのロールに基づいてメニュー項目をフィルタリング
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return user?.role && item.roles.includes(user.role)
  })

  const handleClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  return (
    <nav
      className={cn(
        'space-y-1',
        isMobile ? 'px-2 pb-4 pt-2' : 'px-2 py-4'
      )}
      aria-label="メインナビゲーション"
    >
      {filteredNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleClick}
            className={cn(
              'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground group-hover:text-accent-foreground'
              )}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
