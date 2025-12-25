/**
 * ダッシュボードAPI スキーマ定義
 * API仕様書 6.1 ダッシュボード情報取得に対応
 */

import { z } from 'zod'

/**
 * 今日の日報状況
 */
export const todayStatusSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定してください'),
  has_report: z.boolean(),
  report_id: z.number().nullable(),
})

/**
 * 最近の日報アイテム（営業用）
 */
export const recentReportItemSchema = z.object({
  id: z.number(),
  report_date: z.string(),
  visit_count: z.number(),
  comment_count: z.number(),
})

/**
 * 承認待ち日報アイテム（上長用）
 */
export const pendingReportItemSchema = z.object({
  id: z.number(),
  user: z.object({
    id: z.number(),
    name: z.string(),
  }),
  report_date: z.string(),
  visit_count: z.number(),
  comment_count: z.number(),
})

/**
 * 営業ユーザー向けダッシュボードレスポンス
 */
export const salesDashboardResponseSchema = z.object({
  today: todayStatusSchema,
  recent_reports: z.array(recentReportItemSchema),
})

/**
 * 上長ユーザー向けダッシュボードレスポンス
 */
export const managerDashboardResponseSchema = z.object({
  today: todayStatusSchema,
  recent_reports: z.array(recentReportItemSchema),
  pending_reports: z.array(pendingReportItemSchema),
})

/**
 * ダッシュボードレスポンス型（営業または上長）
 */
export const dashboardResponseSchema = z.union([
  salesDashboardResponseSchema,
  managerDashboardResponseSchema,
])

/**
 * TypeScript型エクスポート
 */
export type TodayStatus = z.infer<typeof todayStatusSchema>
export type RecentReportItem = z.infer<typeof recentReportItemSchema>
export type PendingReportItem = z.infer<typeof pendingReportItemSchema>
export type SalesDashboardResponse = z.infer<typeof salesDashboardResponseSchema>
export type ManagerDashboardResponse = z.infer<typeof managerDashboardResponseSchema>
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>
