import { NextRequest, NextResponse } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { requireAuth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import type { MeResponse } from '@/schemas/auth'

/**
 * GET /api/auth/me
 * 現在ログインしているユーザーの情報を取得する
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const payload = requireAuth(request)

    // データベースから最新のユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
      },
    })

    // ユーザーが存在しない場合（削除された等）
    if (!user) {
      throw ApiError.notFound('ユーザーが見つかりません')
    }

    // レスポンスデータを作成
    const responseData: MeResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      created_at: user.createdAt.toISOString(),
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
    console.error('Get me error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}
