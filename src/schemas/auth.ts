import { z } from 'zod'

/**
 * ログインリクエストのバリデーションスキーマ
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'メールアドレスを入力してください' })
    .email({ message: '有効なメールアドレスを入力してください' }),
  password: z
    .string()
    .min(1, { message: 'パスワードを入力してください' }),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * ログインレスポンスの型定義
 */
export interface LoginResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    role: 'sales' | 'manager'
    department: string | null
  }
}

/**
 * ログアウトレスポンスの型定義
 */
export interface LogoutResponse {
  message: string
}

/**
 * ログインユーザー情報レスポンスの型定義
 */
export interface MeResponse {
  id: number
  name: string
  email: string
  role: 'sales' | 'manager'
  department: string | null
  created_at: string
}
