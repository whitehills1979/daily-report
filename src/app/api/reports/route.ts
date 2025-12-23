import { NextRequest, NextResponse } from 'next/server'
import { createReportSchema, type CreateReportResponse } from '@/schemas/report'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { requireAuth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'

/**
 * POST /api/reports
 * 新規日報を作成する
 * - 訪問記録を同時に作成
 * - 訪問記録は1件以上必須
 * - 同じ日付の日報の重複作成を防止
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（営業ユーザーのみ作成可能）
    const user = requireAuth(request)

    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = createReportSchema.parse(body)

    // 日付形式の検証とDateオブジェクトへの変換
    const reportDate = new Date(validatedData.report_date)
    if (isNaN(reportDate.getTime())) {
      throw ApiError.validationError('日報日付が不正です')
    }

    // 同じ日付の日報が既に存在するかチェック
    const existingReport = await prisma.dailyReport.findUnique({
      where: {
        userId_reportDate: {
          userId: user.userId,
          reportDate: reportDate,
        },
      },
    })

    if (existingReport) {
      throw ApiError.validationError('この日付の日報は既に登録されています', [
        {
          field: 'report_date',
          message: 'この日付の日報は既に登録されています',
        },
      ])
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

    // トランザクションで日報と訪問記録を作成
    const dailyReport = await prisma.dailyReport.create({
      data: {
        userId: user.userId,
        reportDate: reportDate,
        problem: validatedData.problem || null,
        plan: validatedData.plan || null,
        visitRecords: {
          create: validatedData.visits.map((visit) => ({
            customerId: visit.customer_id,
            visitContent: visit.visit_content,
            visitTime: visit.visit_time ? visit.visit_time + ':00' : null,
            durationMinutes: visit.duration_minutes ?? null,
          })),
        },
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

    // レスポンスデータを作成
    const responseData: CreateReportResponse = {
      id: dailyReport.id,
      report_date: dailyReport.reportDate.toISOString().split('T')[0],
      problem: dailyReport.problem,
      plan: dailyReport.plan,
      visits: dailyReport.visitRecords.map((visit) => ({
        id: visit.id,
        customer_id: visit.customerId,
        visit_content: visit.visitContent,
        visit_time: visit.visitTime
          ? visit.visitTime.toString().substring(0, 5)
          : null,
        duration_minutes: visit.durationMinutes,
      })),
      created_at: dailyReport.createdAt.toISOString(),
      updated_at: dailyReport.updatedAt.toISOString(),
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
    console.error('Create report error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}
