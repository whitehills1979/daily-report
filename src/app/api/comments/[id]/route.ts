import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/require-auth'
import {
  updateCommentSchema,
  type UpdateCommentResponse,
} from '@/schemas/comment'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'

/**
 * PUT /api/comments/:id
 * コメントを更新する（本人のみ）
 */
export const PUT = requireAuth(async (request, user) => {
  try {
    // パスパラメータからコメントIDを取得
    const url = new URL(request.url)
    const commentId = parseInt(url.pathname.split('/')[3])

    if (isNaN(commentId)) {
      throw ApiError.validationError('無効なコメントIDです')
    }

    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = updateCommentSchema.parse(body)

    // コメントが存在するか確認
    const existingComment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    })

    if (!existingComment) {
      throw ApiError.notFound('コメントが見つかりません')
    }

    // 本人のコメントかチェック
    if (existingComment.userId !== user.userId) {
      throw ApiError.forbidden('他人のコメントは編集できません')
    }

    // コメントを更新
    const updatedComment = await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: validatedData.content,
      },
    })

    // レスポンスデータを作成
    const responseData: UpdateCommentResponse = {
      id: updatedComment.id,
      content: updatedComment.content,
      updated_at: updatedComment.updatedAt.toISOString(),
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
    console.error('Update comment error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/comments/:id
 * コメントを削除する（本人のみ）
 */
export const DELETE = requireAuth(async (request, user) => {
  try {
    // パスパラメータからコメントIDを取得
    const url = new URL(request.url)
    const commentId = parseInt(url.pathname.split('/')[3])

    if (isNaN(commentId)) {
      throw ApiError.validationError('無効なコメントIDです')
    }

    // コメントが存在するか確認
    const existingComment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    })

    if (!existingComment) {
      throw ApiError.notFound('コメントが見つかりません')
    }

    // 本人のコメントかチェック
    if (existingComment.userId !== user.userId) {
      throw ApiError.forbidden('他人のコメントは削除できません')
    }

    // コメントを削除
    await prisma.comment.delete({
      where: {
        id: commentId,
      },
    })

    // 204 No Content
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    // カスタムAPIエラー
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // 予期しないエラー
    console.error('Delete comment error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
})
