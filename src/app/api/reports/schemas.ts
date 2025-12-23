import { z } from 'zod'

/**
 * 日報一覧取得APIのクエリパラメータスキーマ
 */
export const getReportsQuerySchema = z.object({
  user_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
})

export type GetReportsQuery = z.infer<typeof getReportsQuerySchema>

/**
 * 日報一覧レスポンスのデータ型
 */
export interface ReportListItem {
  id: number
  user: {
    id: number
    name: string
  }
  report_date: string
  visit_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface ReportsListResponse {
  reports: ReportListItem[]
  pagination: {
    current_page: number
    per_page: number
    total_pages: number
    total_count: number
  }
}

/**
 * 日報詳細レスポンスのデータ型
 */
export interface ReportDetailResponse {
  id: number
  user: {
    id: number
    name: string
    department: string | null
  }
  report_date: string
  problem: string | null
  plan: string | null
  visits: Array<{
    id: number
    customer: {
      id: number
      name: string
      company_name: string
    }
    visit_content: string
    visit_time: string | null
    duration_minutes: number | null
    created_at: string
  }>
  comments: Array<{
    id: number
    user: {
      id: number
      name: string
      role: string
    }
    comment_type: string
    content: string
    created_at: string
  }>
  created_at: string
  updated_at: string
}
