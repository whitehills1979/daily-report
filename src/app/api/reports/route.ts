import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/middleware/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { getReportsQuerySchema, type ReportsListResponse } from './schemas'

/**
 * 日報一覧取得 API
 * GET /api/reports
 *
 * 営業ユーザー: 自分の日報のみ取得可能
 * 上長ユーザー: 全ユーザーの日報を取得可能
 *
 * クエリパラメータ:
 * - user_id: ユーザーID（上長のみ指定可能）
 * - date_from: 開始日（YYYY-MM-DD）
 * - date_to: 終了日（YYYY-MM-DD）
 * - customer_id: 顧客ID
 * - page: ページ番号（デフォルト: 1）
 * - per_page: 1ページあたりの件数（デフォルト: 20、最大: 100）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = requireAuth(request)

    // クエリパラメータのバリデーション
    const searchParams = request.nextUrl.searchParams
    const queryParams: any = {}

    if (searchParams.get('user_id')) queryParams.user_id = searchParams.get('user_id')
    if (searchParams.get('date_from')) queryParams.date_from = searchParams.get('date_from')
    if (searchParams.get('date_to')) queryParams.date_to = searchParams.get('date_to')
    if (searchParams.get('customer_id')) queryParams.customer_id = searchParams.get('customer_id')
    queryParams.page = searchParams.get('page') || '1'
    queryParams.per_page = searchParams.get('per_page') || '20'

    const validationResult = getReportsQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      throw ApiError.validationError(
        '入力値が不正です',
        validationResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      )
    }

    const query = validationResult.data

    // 権限チェック: 営業は自分の日報のみ、上長は全員の日報を取得可能
    let targetUserId: number | undefined
    if (user.role === 'sales') {
      // 営業ユーザーは自分の日報のみ
      targetUserId = user.userId
      // user_idパラメータが指定されていて、自分以外のIDが指定されている場合はエラー
      if (query.user_id && query.user_id !== user.userId) {
        throw ApiError.forbidden('自分の日報のみ閲覧できます')
      }
    } else if (user.role === 'manager') {
      // 上長ユーザーはuser_idパラメータで絞り込み可能
      targetUserId = query.user_id
    }

    // デフォルトの期間設定（当月1日〜本日）
    const today = new Date()
    const defaultDateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const defaultDateTo = today.toISOString().split('T')[0]

    const dateFrom = query.date_from || defaultDateFrom
    const dateTo = query.date_to || defaultDateTo

    // WHERE条件の構築
    const whereConditions: any = {
      reportDate: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      },
    }

    if (targetUserId) {
      whereConditions.userId = targetUserId
    }

    // 顧客IDでフィルタリング（指定された顧客への訪問記録を含む日報のみ）
    if (query.customer_id) {
      whereConditions.visitRecords = {
        some: {
          customerId: query.customer_id,
        },
      }
    }

    // 総件数を取得
    const totalCount = await prisma.dailyReport.count({
      where: whereConditions,
    })

    // ページネーション計算
    const totalPages = Math.ceil(totalCount / query.per_page)
    const skip = (query.page - 1) * query.per_page

    // 日報を取得（日付降順）
    const reports = await prisma.dailyReport.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        visitRecords: {
          select: {
            id: true,
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        reportDate: 'desc',
      },
      skip,
      take: query.per_page,
    })

    // レスポンスデータの整形
    const responseData: ReportsListResponse = {
      reports: reports.map((report) => ({
        id: report.id,
        user: {
          id: report.user.id,
          name: report.user.name,
        },
        report_date: report.reportDate.toISOString().split('T')[0],
        visit_count: report.visitRecords.length,
        comment_count: report.comments.length,
        created_at: report.createdAt.toISOString(),
        updated_at: report.updatedAt.toISOString(),
      })),
      pagination: {
        current_page: query.page,
        per_page: query.per_page,
        total_pages: totalPages,
        total_count: totalCount,
      },
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

    console.error('Unexpected error in GET /api/reports:', error)
    const internalError = ApiError.internalError('サーバーエラーが発生しました')
    return NextResponse.json(
      errorResponse(internalError.code, internalError.message),
      { status: internalError.statusCode }
    )
  }
}
