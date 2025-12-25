import { NextRequest, NextResponse } from 'next/server'
import { requireManager } from '@/middleware/require-role'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { hashPassword } from '@/lib/auth'
import { updateUserSchema, type UserResponse } from '@/schemas/user.schema'

/**
 * GET /api/users/:id
 * ユーザー詳細取得（上長のみ）
 */
export const GET = requireManager(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params
      const userId = parseInt(id, 10)

      if (isNaN(userId)) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', '無効なユーザーIDです'),
          { status: 400 }
        )
      }

      // ユーザーを取得
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        return NextResponse.json(
          errorResponse('NOT_FOUND', 'ユーザーが見つかりません'),
          { status: 404 }
        )
      }

      // レスポンスデータを構築
      const responseData: UserResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }

      return NextResponse.json(successResponse(responseData), { status: 200 })
    } catch (error: any) {
      // カスタムAPIエラー
      if (error instanceof ApiError) {
        return NextResponse.json(
          errorResponse(error.code, error.message, error.details),
          { status: error.statusCode }
        )
      }

      // 予期しないエラー
      console.error('Get user error:', error)
      return NextResponse.json(
        errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
        { status: 500 }
      )
    }
  }
)

/**
 * PUT /api/users/:id
 * ユーザー更新（上長のみ）
 *
 * リクエストボディ:
 * - name: 氏名（任意、100文字以内）
 * - email: メールアドレス（任意、ユニーク）
 * - password: パスワード（任意、8文字以上、英数字）
 * - role: 役割（任意、sales/manager）
 * - department: 部署（任意、100文字以内）
 */
export const PUT = requireManager(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params
      const userId = parseInt(id, 10)

      if (isNaN(userId)) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', '無効なユーザーIDです'),
          { status: 400 }
        )
      }

      // リクエストボディを取得してバリデーション
      const body = await request.json()
      const validatedData = updateUserSchema.parse(body)

      // ユーザーの存在確認
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!existingUser) {
        return NextResponse.json(
          errorResponse('NOT_FOUND', 'ユーザーが見つかりません'),
          { status: 404 }
        )
      }

      // メールアドレスの重複チェック（変更する場合）
      if (validatedData.email && validatedData.email !== existingUser.email) {
        const duplicateUser = await prisma.user.findUnique({
          where: { email: validatedData.email },
        })

        if (duplicateUser) {
          return NextResponse.json(
            errorResponse(
              'DUPLICATE_ERROR',
              'このメールアドレスは既に登録されています'
            ),
            { status: 422 }
          )
        }
      }

      // 更新データを構築
      const updateData: any = {}
      if (validatedData.name !== undefined) updateData.name = validatedData.name
      if (validatedData.email !== undefined)
        updateData.email = validatedData.email
      if (validatedData.role !== undefined) updateData.role = validatedData.role
      if (validatedData.department !== undefined)
        updateData.department = validatedData.department

      // パスワードが指定されている場合はハッシュ化
      if (validatedData.password) {
        updateData.password = await hashPassword(validatedData.password)
      }

      // ユーザーを更新
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
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
      const responseData: UserResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
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
      console.error('Update user error:', error)
      return NextResponse.json(
        errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
        { status: 500 }
      )
    }
  }
)

/**
 * DELETE /api/users/:id
 * ユーザー削除（上長のみ）
 *
 * 制約: 日報を作成済みのユーザーは削除できない
 */
export const DELETE = requireManager(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params
      const userId = parseInt(id, 10)

      if (isNaN(userId)) {
        return NextResponse.json(
          errorResponse('VALIDATION_ERROR', '無効なユーザーIDです'),
          { status: 400 }
        )
      }

      // ユーザーの存在確認
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          dailyReports: {
            take: 1,
          },
        },
      })

      if (!existingUser) {
        return NextResponse.json(
          errorResponse('NOT_FOUND', 'ユーザーが見つかりません'),
          { status: 404 }
        )
      }

      // 日報が存在する場合は削除不可
      if (existingUser.dailyReports.length > 0) {
        return NextResponse.json(
          errorResponse(
            'VALIDATION_ERROR',
            'このユーザーは日報を作成しているため削除できません'
          ),
          { status: 422 }
        )
      }

      // ユーザーを削除
      await prisma.user.delete({
        where: { id: userId },
      })

      return new NextResponse(null, { status: 204 })
    } catch (error: any) {
      // カスタムAPIエラー
      if (error instanceof ApiError) {
        return NextResponse.json(
          errorResponse(error.code, error.message, error.details),
          { status: error.statusCode }
        )
      }

      // 予期しないエラー
      console.error('Delete user error:', error)
      return NextResponse.json(
        errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
        { status: 500 }
      )
    }
  }
)
