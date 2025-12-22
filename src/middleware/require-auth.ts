import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from './auth'
import type { JWTPayload } from '@/types/auth'

/**
 * APIハンドラーの型定義
 * 認証済みユーザー情報を第2引数として受け取る
 */
export type AuthenticatedHandler = (
  request: NextRequest,
  user: JWTPayload
) => Promise<NextResponse> | NextResponse

/**
 * 認証必須のミドルウェア
 * APIルートを認証で保護し、認証済みユーザー情報をハンドラーに渡す
 *
 * このミドルウェアは：
 * 1. リクエストの認証を検証
 * 2. 認証に成功した場合、ユーザー情報を引数としてハンドラーを実行
 * 3. 認証に失敗した場合、401エラーレスポンスを返す
 *
 * @param handler - 認証成功時に実行するハンドラー関数
 * @returns ミドルウェアでラップされたハンドラー
 *
 * @example
 * ```typescript
 * // API Route での使用例
 * export const GET = requireAuth(async (request, user) => {
 *   // user.userId, user.email, user.role にアクセス可能
 *   return NextResponse.json({ message: `Hello ${user.email}` })
 * })
 * ```
 */
export function requireAuth(
  handler: AuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    // 認証チェック
    const authResult = authenticateRequest(request)

    // 認証失敗時はエラーレスポンスを返す
    if (authResult instanceof NextResponse) {
      return authResult
    }

    // 認証成功時はハンドラーを実行
    const { user } = authResult
    return handler(request, user)
  }
}

/**
 * 複数のHTTPメソッドに対応した認証必須ミドルウェア
 *
 * @param handlers - HTTPメソッドとハンドラーのマッピング
 * @returns 各HTTPメソッドに対応する認証付きハンドラー
 *
 * @example
 * ```typescript
 * // 複数メソッドでの使用例
 * const { GET, POST } = requireAuthMulti({
 *   GET: async (request, user) => {
 *     return NextResponse.json({ user })
 *   },
 *   POST: async (request, user) => {
 *     const body = await request.json()
 *     // POST処理...
 *     return NextResponse.json({ success: true })
 *   }
 * })
 *
 * export { GET, POST }
 * ```
 */
export function requireAuthMulti(handlers: {
  GET?: AuthenticatedHandler
  POST?: AuthenticatedHandler
  PUT?: AuthenticatedHandler
  PATCH?: AuthenticatedHandler
  DELETE?: AuthenticatedHandler
}): Record<string, (request: NextRequest) => Promise<NextResponse>> {
  const result: Record<string, (request: NextRequest) => Promise<NextResponse>> = {}

  if (handlers.GET) {
    result.GET = requireAuth(handlers.GET)
  }
  if (handlers.POST) {
    result.POST = requireAuth(handlers.POST)
  }
  if (handlers.PUT) {
    result.PUT = requireAuth(handlers.PUT)
  }
  if (handlers.PATCH) {
    result.PATCH = requireAuth(handlers.PATCH)
  }
  if (handlers.DELETE) {
    result.DELETE = requireAuth(handlers.DELETE)
  }

  return result
}
