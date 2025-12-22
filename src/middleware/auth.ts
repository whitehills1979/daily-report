import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { ApiError } from '@/lib/api-error'
import { errorResponse } from '@/lib/api-response'
import type { JWTPayload } from '@/types/auth'

/**
 * Authorizationヘッダーからトークンを抽出する
 * @param request - NextRequest
 * @returns トークン文字列、存在しない場合はnull
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return null
  }

  // Bearer トークン形式のチェック
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * JWTトークンを検証し、ユーザー情報をリクエストに追加する認証ミドルウェア
 *
 * このミドルウェアは以下を実行します：
 * 1. Authorizationヘッダーからトークンを抽出
 * 2. トークンの検証
 * 3. 検証成功時、リクエストオブジェクトにユーザー情報を設定
 *
 * @param request - NextRequest
 * @returns 検証成功時はユーザー情報を含むリクエスト、失敗時は401エラーレスポンス
 *
 * @example
 * ```typescript
 * // API Route での使用例
 * export async function GET(request: NextRequest) {
 *   const authResult = await authenticateRequest(request)
 *
 *   if (authResult instanceof NextResponse) {
 *     return authResult // 認証エラー
 *   }
 *
 *   const { user } = authResult
 *   // 認証済みユーザーの処理...
 * }
 * ```
 */
export function authenticateRequest(
  request: NextRequest
): { user: JWTPayload; request: NextRequest } | NextResponse {
  try {
    // トークンの抽出
    const token = extractToken(request)

    if (!token) {
      const error = ApiError.unauthorized('認証トークンが提供されていません')
      return NextResponse.json(
        errorResponse(error.code, error.message),
        { status: error.statusCode }
      )
    }

    // トークンの検証
    let payload: JWTPayload
    try {
      payload = verifyToken(token)
    } catch (err) {
      const error = ApiError.unauthorized('認証トークンが無効または期限切れです')
      return NextResponse.json(
        errorResponse(error.code, error.message),
        { status: error.statusCode }
      )
    }

    // ユーザー情報をリクエストに追加
    // Note: Next.jsのNextRequestは不変オブジェクトのため、
    // userプロパティを動的に追加することで拡張します
    Object.defineProperty(request, 'user', {
      value: payload,
      writable: false,
      enumerable: true,
      configurable: false,
    })

    return { user: payload, request }
  } catch (error) {
    // 予期しないエラー
    const apiError = ApiError.internalError('認証処理中にエラーが発生しました')
    return NextResponse.json(
      errorResponse(apiError.code, apiError.message),
      { status: apiError.statusCode }
    )
  }
}

/**
 * 認証ミドルウェアのラッパー関数
 * エラーハンドリングを含めた完全な認証フローを提供
 *
 * @param request - NextRequest
 * @returns 認証成功時はユーザー情報、失敗時はエラーレスポンス
 */
export async function withAuth(
  request: NextRequest
): Promise<{ user: JWTPayload } | NextResponse> {
  const result = authenticateRequest(request)

  if (result instanceof NextResponse) {
    return result
  }

  return { user: result.user }
}
