import { NextRequest, NextResponse } from 'next/server'
import { requireManager } from '@/middleware/require-role'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { hashPassword } from '@/lib/password'
import {
  createUserSchema,
  userSearchSchema,
  type UserResponse,
  type UserListResponse,
} from '@/schemas/user.schema'

/**
 * GET /api/users
 * ユーザー一覧取得（上長のみ）
 *
 * クエリパラメータ:
 * - role: 役割でフィルタ（sales/manager）
 * - department: 部署でフィルタ
 * - page: ページ番号（デフォルト: 1）
 * - per_page: 1ページあたりの件数（デフォルト: 20、最大: 100）
 */
export const GET = requireManager(async (request: NextRequest) => {
  try {
    // クエリパラメータを取得してバリデーション
    const { searchParams } = new URL(request.url)
    const validatedParams = userSearchSchema.parse({
      role: searchParams.get('role'),
      department: searchParams.get('department'),
      page: searchParams.get('page'),
      per_page: searchParams.get('per_page'),
    })

    const { role, department, page, per_page } = validatedParams

    // 検索条件を構築
    const whereClause: any = {}
    if (role) {
      whereClause.role = role
    }
    if (department) {
      whereClause.department = { contains: department, mode: 'insensitive' }
    }

    // 総件数を取得
    const totalCount = await prisma.user.count({
      where: whereClause,
    })

    // ページネーション計算
    const totalPages = Math.ceil(totalCount / per_page)
    const skip = (page - 1) * per_page

    // ユーザー一覧を取得
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: per_page,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // レスポンスデータを構築
    const userList: UserResponse[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }))

    const responseData: UserListResponse = {
      users: userList,
      pagination: {
        currentPage: page,
        perPage: per_page,
        totalPages,
        totalCount,
      },
    }

    return NextResponse.json(successResponse(responseData), { status: 200 })
  } catch (error: any) {
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
    console.error('Get users error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
})

/**
 * POST /api/users
 * ユーザー作成（上長のみ）
 *
 * リクエストボディ:
 * - name: 氏名（必須、100文字以内）
 * - email: メールアドレス（必須、ユニーク）
 * - password: パスワード（必須、8文字以上、英数字）
 * - role: 役割（必須、sales/manager）
 * - department: 部署（任意、100文字以内）
 */
export const POST = requireManager(async (request: NextRequest) => {
  try {
    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        errorResponse(
          'DUPLICATE_ERROR',
          'このメールアドレスは既に登録されています'
        ),
        { status: 422 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(validatedData.password)

    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        department: validatedData.department || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // レスポンスデータを構築（パスワードは含めない）
    const responseData: UserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }

    return NextResponse.json(successResponse(responseData), { status: 201 })
  } catch (error: any) {
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
    console.error('Create user error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
})
