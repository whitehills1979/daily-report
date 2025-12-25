/**
 * ダッシュボードAPI
 * GET /api/dashboard
 *
 * ダッシュボード表示に必要な情報を取得します。
 * - 営業ユーザー: 今日の日報状況 + 最近の日報一覧（直近10件）
 * - 上長ユーザー: 今日の日報状況 + 承認待ち日報一覧（コメント0件の日報）
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/middleware/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import type {
  SalesDashboardResponse,
  ManagerDashboardResponse,
  TodayStatus,
  RecentReportItem,
  PendingReportItem,
} from './schemas'

/**
 * ダッシュボード情報取得
 *
 * 役割に応じた情報を返却：
 * - 営業(sales): 自分の今日の日報状況 + 直近10件の自分の日報
 * - 上長(manager): 今日の日報状況 + 配下メンバーの承認待ち日報（コメント0件）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = requireAuth(request)

    // 今日の日付を取得（YYYY-MM-DD形式）
    const today = new Date()
    const todayDateString = today.toISOString().split('T')[0]

    // 今日の日報状況を取得
    const todayReport = await prisma.dailyReport.findFirst({
      where: {
        userId: user.userId,
        reportDate: new Date(todayDateString),
      },
      select: {
        id: true,
      },
    })

    const todayStatus: TodayStatus = {
      date: todayDateString,
      has_report: todayReport !== null,
      report_id: todayReport?.id || null,
    }

    if (user.role === 'sales') {
      // 営業ユーザーの場合: 直近10件の自分の日報を取得
      const recentReports = await prisma.dailyReport.findMany({
        where: {
          userId: user.userId,
        },
        include: {
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
        take: 10,
      })

      const recentReportItems: RecentReportItem[] = recentReports.map((report) => ({
        id: report.id,
        report_date: report.reportDate.toISOString().split('T')[0],
        visit_count: report.visitRecords.length,
        comment_count: report.comments.length,
      }))

      const responseData: SalesDashboardResponse = {
        today: todayStatus,
        recent_reports: recentReportItems,
      }

      return NextResponse.json(successResponse(responseData), { status: 200 })
    } else if (user.role === 'manager') {
      // 上長ユーザーの場合: 空の最近の日報 + 承認待ち日報を取得

      // 承認待ち日報 = コメント数が0件の日報
      // 全ユーザーの日報を対象とし、コメントが0件のものを抽出
      const pendingReports = await prisma.dailyReport.findMany({
        where: {
          comments: {
            none: {},
          },
        },
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
      })

      const pendingReportItems: PendingReportItem[] = pendingReports.map((report) => ({
        id: report.id,
        user: {
          id: report.user.id,
          name: report.user.name,
        },
        report_date: report.reportDate.toISOString().split('T')[0],
        visit_count: report.visitRecords.length,
        comment_count: report.comments.length,
      }))

      const responseData: ManagerDashboardResponse = {
        today: todayStatus,
        recent_reports: [],
        pending_reports: pendingReportItems,
      }

      return NextResponse.json(successResponse(responseData), { status: 200 })
    } else {
      // 未知のロールの場合（通常は発生しない）
      throw ApiError.forbidden('アクセス権限がありません')
    }
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

    console.error('Unexpected error in GET /api/dashboard:', error)
    const internalError = ApiError.internalError('サーバーエラーが発生しました')
    return NextResponse.json(
      errorResponse(internalError.code, internalError.message),
      { status: internalError.statusCode }
    )
  }
}
