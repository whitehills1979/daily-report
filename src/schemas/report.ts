import { z } from 'zod'

/**
 * 訪問記録のバリデーションスキーマ（作成時）
 */
export const visitRecordCreateSchema = z.object({
  customer_id: z.number({
    required_error: '顧客IDを指定してください',
    invalid_type_error: '顧客IDは数値で指定してください',
  }).int().positive({ message: '顧客IDは正の整数で指定してください' }),
  visit_content: z
    .string({ required_error: '訪問内容を入力してください' })
    .min(1, { message: '訪問内容を入力してください' })
    .max(1000, { message: '訪問内容は1000文字以内で入力してください' }),
  visit_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
      message: '訪問時刻はHH:MM形式で入力してください',
    })
    .optional(),
  duration_minutes: z
    .number()
    .int()
    .min(0, { message: '訪問時間は0以上の整数で入力してください' })
    .optional(),
})

/**
 * 訪問記録のバリデーションスキーマ（更新時）
 * idフィールドを含む（既存訪問記録の更新用）
 */
export const visitRecordUpdateSchema = visitRecordCreateSchema.extend({
  id: z.number().int().positive().optional(),
})

/**
 * 日報作成のバリデーションスキーマ
 */
export const createReportSchema = z.object({
  report_date: z
    .string({ required_error: '日報日付を指定してください' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: '日報日付はYYYY-MM-DD形式で入力してください',
    }),
  problem: z
    .string()
    .max(2000, { message: '課題・相談は2000文字以内で入力してください' })
    .optional()
    .nullable(),
  plan: z
    .string()
    .max(2000, { message: '明日やることは2000文字以内で入力してください' })
    .optional()
    .nullable(),
  visits: z
    .array(visitRecordCreateSchema)
    .min(1, { message: '訪問記録を少なくとも1件追加してください' }),
})

/**
 * 日報更新のバリデーションスキーマ
 */
export const updateReportSchema = z.object({
  problem: z
    .string()
    .max(2000, { message: '課題・相談は2000文字以内で入力してください' })
    .optional()
    .nullable(),
  plan: z
    .string()
    .max(2000, { message: '明日やることは2000文字以内で入力してください' })
    .optional()
    .nullable(),
  visits: z
    .array(visitRecordUpdateSchema)
    .min(1, { message: '訪問記録を少なくとも1件追加してください' }),
})

export type VisitRecordCreateInput = z.infer<typeof visitRecordCreateSchema>
export type VisitRecordUpdateInput = z.infer<typeof visitRecordUpdateSchema>
export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateReportInput = z.infer<typeof updateReportSchema>

/**
 * 日報作成レスポンスの型定義
 */
export interface CreateReportResponse {
  id: number
  report_date: string
  problem: string | null
  plan: string | null
  visits: Array<{
    id: number
    customer_id: number
    visit_content: string
    visit_time: string | null
    duration_minutes: number | null
  }>
  created_at: string
  updated_at: string
}

/**
 * 日報更新レスポンスの型定義
 */
export type UpdateReportResponse = CreateReportResponse
