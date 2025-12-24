import { z } from 'zod'

/**
 * 顧客作成スキーマ
 */
export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, '顧客名を入力してください')
    .max(100, '顧客名は100文字以内で入力してください'),
  companyName: z
    .string()
    .min(1, '会社名を入力してください')
    .max(200, '会社名は200文字以内で入力してください'),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('正しいメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください')
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, '住所は500文字以内で入力してください')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, '備考は1000文字以内で入力してください')
    .optional()
    .nullable(),
})

/**
 * 顧客更新スキーマ
 */
export const updateCustomerSchema = z.object({
  name: z
    .string()
    .min(1, '顧客名を入力してください')
    .max(100, '顧客名は100文字以内で入力してください'),
  companyName: z
    .string()
    .min(1, '会社名を入力してください')
    .max(200, '会社名は200文字以内で入力してください'),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('正しいメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください')
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, '住所は500文字以内で入力してください')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, '備考は1000文字以内で入力してください')
    .optional()
    .nullable(),
})

/**
 * 顧客検索クエリパラメータスキーマ
 */
export const customerSearchSchema = z.object({
  keyword: z.string().optional().nullable(),
  page: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return 1
      const num = parseInt(val, 10)
      return isNaN(num) ? 1 : num
    })
    .pipe(z.number().int().positive()),
  per_page: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return 20
      const num = parseInt(val, 10)
      return isNaN(num) ? 20 : num
    })
    .pipe(z.number().int().positive().max(100)),
})

/**
 * 型定義
 */
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerSearchParams = z.infer<typeof customerSearchSchema>

/**
 * レスポンス型定義
 */
export interface CustomerResponse {
  id: number
  name: string
  companyName: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CustomerListResponse {
  customers: CustomerResponse[]
  pagination: {
    currentPage: number
    perPage: number
    totalPages: number
    totalCount: number
  }
}
