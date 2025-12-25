import { z } from 'zod'

/**
 * ユーザー作成スキーマ
 */
export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, '氏名を入力してください')
    .max(100, '氏名は100文字以内で入力してください'),
  email: z
    .string()
    .email('正しいメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(/[a-zA-Z]/, 'パスワードは英字を含む必要があります')
    .regex(/\d/, 'パスワードは数字を含む必要があります'),
  role: z.enum(['sales', 'manager'], {
    errorMap: () => ({ message: '役割はsalesまたはmanagerを指定してください' }),
  }),
  department: z
    .string()
    .max(100, '部署は100文字以内で入力してください')
    .optional()
    .nullable(),
})

/**
 * ユーザー更新スキーマ
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, '氏名を入力してください')
    .max(100, '氏名は100文字以内で入力してください')
    .optional(),
  email: z
    .string()
    .email('正しいメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください')
    .optional(),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(/[a-zA-Z]/, 'パスワードは英字を含む必要があります')
    .regex(/\d/, 'パスワードは数字を含む必要があります')
    .optional(),
  role: z
    .enum(['sales', 'manager'], {
      errorMap: () => ({ message: '役割はsalesまたはmanagerを指定してください' }),
    })
    .optional(),
  department: z
    .string()
    .max(100, '部署は100文字以内で入力してください')
    .optional()
    .nullable(),
})

/**
 * ユーザー検索スキーマ
 */
export const userSearchSchema = z.object({
  role: z.enum(['sales', 'manager']).optional().nullable(),
  department: z.string().optional().nullable(),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().default(1)),
  per_page: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100).default(20)),
})

/**
 * ユーザーレスポンス型
 */
export interface UserResponse {
  id: number
  name: string
  email: string
  role: 'sales' | 'manager'
  department: string | null
  createdAt: string
  updatedAt: string
}

/**
 * ユーザー一覧レスポンス型
 */
export interface UserListResponse {
  users: UserResponse[]
  pagination: {
    currentPage: number
    perPage: number
    totalPages: number
    totalCount: number
  }
}

/**
 * ユーザー作成リクエスト型
 */
export type CreateUserRequest = z.infer<typeof createUserSchema>

/**
 * ユーザー更新リクエスト型
 */
export type UpdateUserRequest = z.infer<typeof updateUserSchema>

/**
 * ユーザー検索リクエスト型
 */
export type UserSearchRequest = z.infer<typeof userSearchSchema>
