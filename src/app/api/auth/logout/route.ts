import { NextRequest, NextResponse } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { requireAuth } from '@/middleware/auth'
import type { LogoutResponse } from '@/schemas/auth'

/**
 * POST /api/auth/logout
 * ログアウト処理を行う
 *
 * Note: 今回はトークン無効化は実装しない。
 * クライアント側でトークンを削除することでログアウトを実現する。
 * 将来的にはRedis等を使用してトークンのブラックリストを管理することを検討。
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（トークンが有効かどうかを確認）
    requireAuth(request)

    const responseData: LogoutResponse = {
      message: 'ログアウトしました',
    }

    return NextResponse.json(successResponse(responseData), { status: 200 })
  } catch (error) {
    // カスタムAPIエラー
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // 予期しないエラー
    console.error('Logout error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}
