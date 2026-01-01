'use client'

/**
 * ヘッダーコンポーネント
 * ロゴ、ユーザー情報、ログアウトボタンを含むアプリケーションヘッダー
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface HeaderProps {
  /** モバイルメニューのトグル関数 */
  onMenuClick?: () => void
}

/**
 * ユーザー名のイニシャルを取得
 */
function getInitials(name: string): string {
  // 日本語の名前の場合、最初の1文字を返す
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(name)) {
    return name.charAt(0)
  }
  // 英語の名前の場合、最初の2文字を返す
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * ヘッダーコンポーネント
 */
export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, isLoading } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* モバイルメニューボタン */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={onMenuClick}
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* ロゴ */}
        <div className="mr-4 flex">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-lg font-bold">営業日報システム</span>
          </Link>
        </div>

        {/* スペーサー */}
        <div className="flex flex-1" />

        {/* ユーザーメニュー */}
        {!isLoading && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full md:h-auto md:w-auto md:rounded-md md:px-3"
              >
                <Avatar className="h-8 w-8 md:mr-2">
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.role === 'manager' ? '上長' : '営業'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  プロフィール
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
