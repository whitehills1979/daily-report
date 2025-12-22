import { NextRequest, NextResponse } from 'next/server'
import { loginSchema, type LoginResponse } from '@/schemas/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { generateToken } from '@/lib/auth'
import { verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'

/**
 * POST /api/auth/login
 * ユーザー認証を行い、JWTトークンを発行する
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: {
        email: validatedData.email,
      },
    })

    // ユーザーが存在しない、またはパスワードが一致しない場合
    if (!user) {
      throw ApiError.unauthorized(
        'メールアドレスまたはパスワードが正しくありません'
      )
    }

    // パスワードを検証
    const isPasswordValid = await verifyPassword(
      validatedData.password,
      user.password
    )

    if (!isPasswordValid) {
      throw ApiError.unauthorized(
        'メールアドレスまたはパスワードが正しくありません'
      )
    }

    // JWTトークンを生成
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // レスポンスデータを作成（パスワードは含めない）
    const responseData: LoginResponse = {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    }

    return NextResponse.json(successResponse(responseData), { status: 200 })
  } catch (error) {
    // Zodバリデーションエラー
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', '入力値が不正です', details),
        { status: 422 }
      )
    }

    // カスタムAPIエラー
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // 予期しないエラー
    console.error('Login error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}
