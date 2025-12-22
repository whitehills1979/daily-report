import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { ApiError } from '@/lib/api-error'
import type { JWTPayload } from '@/types/auth'

/**
 * リクエストヘッダーからJWTトークンを抽出する
 * @param request - Next.jsのリクエストオブジェクト
 * @returns JWTトークン文字列、存在しない場合はnull
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return null
  }

  // "Bearer <token>" 形式のヘッダーからトークンを抽出
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * リクエストから認証ユーザー情報を取得する
 * @param request - Next.jsのリクエストオブジェクト
 * @returns JWTペイロード（認証ユーザー情報）
 * @throws {ApiError} トークンが無効または存在しない場合
 */
export function requireAuth(request: NextRequest): JWTPayload {
  const token = extractToken(request)

  if (!token) {
    throw ApiError.unauthorized('認証が必要です')
  }

  try {
    const payload = verifyToken(token)
    return payload
  } catch (error) {
    throw ApiError.unauthorized('トークンが無効です')
  }
}

/**
 * 特定のロールのみがアクセスできることを確認する
 * @param payload - JWTペイロード
 * @param allowedRoles - 許可されるロールの配列
 * @throws {ApiError} ユーザーのロールが許可されていない場合
 */
export function requireRole(
  payload: JWTPayload,
  allowedRoles: Array<'sales' | 'manager'>
): void {
  if (!allowedRoles.includes(payload.role)) {
    throw ApiError.forbidden('この操作を実行する権限がありません')
  }
}
