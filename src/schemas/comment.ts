import { z } from 'zod'

/**
 * コメント種別のEnum
 */
export const CommentType = z.enum(['problem', 'plan', 'general'], {
  errorMap: () => ({
    message: 'コメント種別はproblem, plan, generalのいずれかを指定してください',
  }),
})

/**
 * コメント追加リクエストのバリデーションスキーマ
 */
export const createCommentSchema = z.object({
  comment_type: CommentType,
  content: z
    .string()
    .min(1, { message: 'コメントを入力してください' })
    .max(500, { message: 'コメントは500文字以内で入力してください' }),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>

/**
 * コメント更新リクエストのバリデーションスキーマ
 */
export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: 'コメントを入力してください' })
    .max(500, { message: 'コメントは500文字以内で入力してください' }),
})

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

/**
 * コメントレスポンスの型定義
 */
export interface CommentResponse {
  id: number
  user: {
    id: number
    name: string
    role: 'sales' | 'manager'
  }
  comment_type: 'problem' | 'plan' | 'general'
  content: string
  created_at: string
}

/**
 * コメント更新レスポンスの型定義
 */
export interface UpdateCommentResponse {
  id: number
  content: string
  updated_at: string
}
