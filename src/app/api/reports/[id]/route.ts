import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/middleware/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import type { ReportDetailResponse } from '../schemas'

/**
 * 日報詳細取得 API
 * GET /api/reports/:id
 *
 * 営業ユーザー: 自分の日報のみ閲覧可能
 * 上長ユーザー: 全ユーザーの日報を閲覧可能
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const user = requireAuth(request)

    // パラメータのバリデーション
    const reportId = parseInt(params.id, 10)
    if (isNaN(reportId) || reportId <= 0) {
      throw ApiError.validationError('不正な日報IDです')
    }

    // 日報を取得
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
        visitRecords: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                companyName: true,
              },
            },
          },
          orderBy: {
            visitTime: 'asc',
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    // 日報が存在しない場合
    if (!report) {
      throw ApiError.notFound('日報が見つかりません')
    }

    // 権限チェック: 営業は自分の日報のみ閲覧可能
    if (user.role === 'sales' && report.userId !== user.userId) {
      throw ApiError.forbidden('この日報を閲覧する権限がありません')
    }

    // レスポンスデータの整形
    const responseData: ReportDetailResponse = {
      id: report.id,
      user: {
        id: report.user.id,
        name: report.user.name,
        department: report.user.department,
      },
      report_date: report.reportDate.toISOString().split('T')[0],
      problem: report.problem,
      plan: report.plan,
      visits: report.visitRecords.map((visit) => ({
        id: visit.id,
        customer: {
          id: visit.customer.id,
          name: visit.customer.name,
          company_name: visit.customer.companyName,
        },
        visit_content: visit.visitContent,
        visit_time: visit.visitTime
          ? visit.visitTime.toISOString().substring(11, 19)
          : null,
        duration_minutes: visit.durationMinutes,
        created_at: visit.createdAt.toISOString(),
      })),
      comments: report.comments.map((comment) => ({
        id: comment.id,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          role: comment.user.role,
        },
        comment_type: comment.commentType,
        content: comment.content,
        created_at: comment.createdAt.toISOString(),
      })),
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    }

    return NextResponse.json(successResponse(responseData), { status: 200 })
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(errorResponse(error.code, error.message, error.details), {
        status: error.statusCode,
      })
    }

    // requireAuthから投げられたエラーオブジェクトの場合
    if (error && typeof error === 'object' && 'statusCode' in error && 'code' in error) {
      return NextResponse.json(errorResponse(error.code, error.message, error.details), {
        status: error.statusCode,
      })
    }

    console.error('Unexpected error in GET /api/reports/:id:', error)
    const internalError = ApiError.internalError('サーバーエラーが発生しました')
    return NextResponse.json(
      errorResponse(internalError.code, internalError.message),
      { status: internalError.statusCode }
    )
  }
}
