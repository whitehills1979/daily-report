import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/middleware/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { updateReportSchema, type UpdateReportResponse } from '@/schemas/report'
import { ZodError } from 'zod'
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

/**
 * PUT /api/reports/[id]
 * 既存の日報を更新する
 * - 訪問記録の追加・更新・削除を行う
 * - 本人の日報のみ更新可能
 * - idを含む訪問記録は更新、含まないものは新規作成
 * - 配列に含まれない既存訪問記録は削除
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const user = requireAuth(request)

    // パスパラメータの検証
    const reportId = parseInt(params.id, 10)
    if (isNaN(reportId) || reportId <= 0) {
      throw ApiError.validationError('日報IDが不正です')
    }

    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = updateReportSchema.parse(body)

    // 日報の存在確認と権限チェック
    const existingReport = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        visitRecords: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!existingReport) {
      throw ApiError.notFound('日報が見つかりません')
    }

    // 本人の日報かチェック
    if (existingReport.userId !== user.userId) {
      throw ApiError.forbidden('この日報を編集する権限がありません')
    }

    // 顧客IDの存在確認（訪問記録に含まれる全顧客）
    const customerIds = validatedData.visits.map((visit) => visit.customer_id)
    const uniqueCustomerIds = [...new Set(customerIds)]

    const customers = await prisma.customer.findMany({
      where: {
        id: {
          in: uniqueCustomerIds,
        },
      },
      select: {
        id: true,
      },
    })

    if (customers.length !== uniqueCustomerIds.length) {
      const foundIds = customers.map((c) => c.id)
      const missingIds = uniqueCustomerIds.filter((id) => !foundIds.includes(id))
      throw ApiError.validationError('存在しない顧客が指定されています', [
        {
          field: 'visits',
          message: `顧客ID ${missingIds.join(', ')} が存在しません`,
        },
      ])
    }

    // 更新対象と新規作成対象の訪問記録を分離
    const visitsToUpdate = validatedData.visits.filter((v) => v.id !== undefined)
    const visitsToCreate = validatedData.visits.filter((v) => v.id === undefined)

    // 既存の訪問記録IDリスト
    const existingVisitIds = existingReport.visitRecords.map((v) => v.id)
    const requestVisitIds = visitsToUpdate
      .map((v) => v.id)
      .filter((id): id is number => id !== undefined)

    // 削除対象の訪問記録（リクエストに含まれない既存訪問記録）
    const visitsToDelete = existingVisitIds.filter(
      (id) => !requestVisitIds.includes(id)
    )

    // 更新対象の訪問記録が既存のものかチェック
    const invalidVisitIds = requestVisitIds.filter(
      (id) => !existingVisitIds.includes(id)
    )
    if (invalidVisitIds.length > 0) {
      throw ApiError.validationError('存在しない訪問記録が指定されています', [
        {
          field: 'visits',
          message: `訪問記録ID ${invalidVisitIds.join(', ')} が存在しません`,
        },
      ])
    }

    // トランザクションで日報と訪問記録を更新
    const updatedReport = await prisma.$transaction(async (tx) => {
      // 削除対象の訪問記録を削除
      if (visitsToDelete.length > 0) {
        await tx.visitRecord.deleteMany({
          where: {
            id: {
              in: visitsToDelete,
            },
            dailyReportId: reportId,
          },
        })
      }

      // 既存の訪問記録を更新
      for (const visit of visitsToUpdate) {
        await tx.visitRecord.update({
          where: {
            id: visit.id,
            dailyReportId: reportId, // 日報に紐づく訪問記録であることを確認
          },
          data: {
            customerId: visit.customer_id,
            visitContent: visit.visit_content,
            visitTime: visit.visit_time ? visit.visit_time + ':00' : null,
            durationMinutes: visit.duration_minutes ?? null,
          },
        })
      }

      // 新規訪問記録を作成
      if (visitsToCreate.length > 0) {
        await tx.visitRecord.createMany({
          data: visitsToCreate.map((visit) => ({
            dailyReportId: reportId,
            customerId: visit.customer_id,
            visitContent: visit.visit_content,
            visitTime: visit.visit_time ? visit.visit_time + ':00' : null,
            durationMinutes: visit.duration_minutes ?? null,
          })),
        })
      }

      // 日報本体を更新
      return await tx.dailyReport.update({
        where: { id: reportId },
        data: {
          problem: validatedData.problem ?? null,
          plan: validatedData.plan ?? null,
        },
        include: {
          visitRecords: {
            select: {
              id: true,
              customerId: true,
              visitContent: true,
              visitTime: true,
              durationMinutes: true,
            },
          },
        },
      })
    })

    // レスポンスデータを作成
    const responseData: UpdateReportResponse = {
      id: updatedReport.id,
      report_date: updatedReport.reportDate.toISOString().split('T')[0],
      problem: updatedReport.problem,
      plan: updatedReport.plan,
      visits: updatedReport.visitRecords.map((visit) => ({
        id: visit.id,
        customer_id: visit.customerId,
        visit_content: visit.visitContent,
        visit_time: visit.visitTime
          ? visit.visitTime.toString().substring(0, 5)
          : null,
        duration_minutes: visit.durationMinutes,
      })),
      created_at: updatedReport.createdAt.toISOString(),
      updated_at: updatedReport.updatedAt.toISOString(),
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
    console.error('Update report error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reports/[id]
 * 日報を削除する
 * - 本人の日報のみ削除可能
 * - カスケード削除により訪問記録とコメントも削除される
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const user = requireAuth(request)

    // パスパラメータの検証
    const reportId = parseInt(params.id, 10)
    if (isNaN(reportId) || reportId <= 0) {
      throw ApiError.validationError('日報IDが不正です')
    }

    // 日報の存在確認と権限チェック
    const existingReport = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!existingReport) {
      throw ApiError.notFound('日報が見つかりません')
    }

    // 本人の日報かチェック
    if (existingReport.userId !== user.userId) {
      throw ApiError.forbidden('この日報を削除する権限がありません')
    }

    // 日報を削除（カスケードで訪問記録とコメントも削除される）
    await prisma.dailyReport.delete({
      where: { id: reportId },
    })

    // 204 No Content を返す（レスポンスボディなし）
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
    console.error('Delete report error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}
