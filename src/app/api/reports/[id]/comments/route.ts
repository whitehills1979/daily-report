import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/middleware/require-role'
import { createCommentSchema, type CommentResponse } from '@/schemas/comment'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'

/**
 * POST /api/reports/:id/comments
 * 日報にコメントを追加する（上長のみ）
 */
export const POST = requireRole('manager', async (request, user) => {
  try {
    // パスパラメータから日報IDを取得
    const url = new URL(request.url)
    const reportId = parseInt(url.pathname.split('/')[3])

    if (isNaN(reportId)) {
      throw ApiError.validationError('無効な日報IDです')
    }

    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = createCommentSchema.parse(body)

    // 日報が存在するか確認
    const report = await prisma.dailyReport.findUnique({
      where: {
        id: reportId,
      },
    })

    if (!report) {
      throw ApiError.notFound('日報が見つかりません')
    }

    // コメントを作成
    const comment = await prisma.comment.create({
      data: {
        dailyReportId: reportId,
        userId: user.userId,
        commentType: validatedData.comment_type,
        content: validatedData.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // レスポンスデータを作成
    const responseData: CommentResponse = {
      id: comment.id,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        role: comment.user.role,
      },
      comment_type: comment.commentType,
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
    }

    return NextResponse.json(successResponse(responseData), { status: 201 })
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
    console.error('Create comment error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
})
