import { NextRequest } from 'next/server'
import type { JWTPayload } from './auth'

/**
 * 認証情報を含む拡張NextRequest型
 * 認証ミドルウェアによってユーザー情報がリクエストに追加される
 */
export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload
}

/**
 * 型ガード: NextRequestがAuthenticatedRequestかどうかを判定
 * @param request - チェックするリクエスト
 * @returns 認証情報を持っている場合はtrue
 */
export function isAuthenticatedRequest(
  request: NextRequest
): request is AuthenticatedRequest {
  return 'user' in request && request.user !== undefined
}
