import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from './auth'
import { ApiError } from '@/lib/api-error'
import { errorResponse } from '@/lib/api-response'
import type { JWTPayload } from '@/types/auth'

/**
 * 役割ベースのハンドラー型定義
 */
export type RoleBasedHandler = (
  request: NextRequest,
  user: JWTPayload
) => Promise<NextResponse> | NextResponse

/**
 * 許可される役割の型
 */
export type AllowedRole = 'sales' | 'manager'

/**
 * 役割ベースのアクセス制御ミドルウェア
 * 特定の役割を持つユーザーのみアクセスを許可する
 *
 * このミドルウェアは：
 * 1. リクエストの認証を検証
 * 2. ユーザーの役割が許可リストに含まれているか確認
 * 3. 許可された役割の場合のみハンドラーを実行
 * 4. 認証失敗時は401、権限不足時は403エラーを返す
 *
 * @param allowedRoles - 許可する役割の配列（単一の役割も可）
 * @param handler - 認証・認可成功時に実行するハンドラー
 * @returns ミドルウェアでラップされたハンドラー
 *
 * @example
 * ```typescript
 * // 上長のみアクセス可能なAPI
 * export const GET = requireRole('manager', async (request, user) => {
 *   // user.role は必ず 'manager'
 *   return NextResponse.json({ data: 'Manager only data' })
 * })
 *
 * // 複数役割を許可
 * export const POST = requireRole(['sales', 'manager'], async (request, user) => {
 *   // user.role は 'sales' または 'manager'
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function requireRole(
  allowedRoles: AllowedRole | AllowedRole[],
  handler: RoleBasedHandler
): (request: NextRequest) => Promise<NextResponse> {
  // 単一の役割を配列に正規化
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  return async (request: NextRequest): Promise<NextResponse> => {
    // 認証チェック
    const authResult = authenticateRequest(request)

    // 認証失敗時はエラーレスポンスを返す
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult

    // 役割チェック
    if (!rolesArray.includes(user.role)) {
      const error = ApiError.forbidden('この操作を実行する権限がありません')
      return NextResponse.json(errorResponse(error.code, error.message), {
        status: error.statusCode,
      })
    }

    // 認証・認可成功時はハンドラーを実行
    return handler(request, user)
  }
}

/**
 * 上長のみアクセス可能なミドルウェア
 * requireRole('manager') のショートカット
 *
 * @param handler - 上長のみが実行できるハンドラー
 * @returns ミドルウェアでラップされたハンドラー
 *
 * @example
 * ```typescript
 * export const DELETE = requireManager(async (request, user) => {
 *   // 上長のみ実行可能
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function requireManager(
  handler: RoleBasedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return requireRole('manager', handler)
}

/**
 * 営業担当者のみアクセス可能なミドルウェア
 * requireRole('sales') のショートカット
 *
 * @param handler - 営業担当者のみが実行できるハンドラー
 * @returns ミドルウェアでラップされたハンドラー
 *
 * @example
 * ```typescript
 * export const POST = requireSales(async (request, user) => {
 *   // 営業担当者のみ実行可能
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function requireSales(
  handler: RoleBasedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return requireRole('sales', handler)
}

/**
 * 複数のHTTPメソッドに対応した役割ベースアクセス制御ミドルウェア
 *
 * @param allowedRoles - 許可する役割
 * @param handlers - HTTPメソッドとハンドラーのマッピング
 * @returns 各HTTPメソッドに対応する認証・認可付きハンドラー
 *
 * @example
 * ```typescript
 * const { GET, DELETE } = requireRoleMulti('manager', {
 *   GET: async (request, user) => {
 *     return NextResponse.json({ data: 'Manager data' })
 *   },
 *   DELETE: async (request, user) => {
 *     return NextResponse.json({ success: true })
 *   }
 * })
 *
 * export { GET, DELETE }
 * ```
 */
export function requireRoleMulti(
  allowedRoles: AllowedRole | AllowedRole[],
  handlers: {
    GET?: RoleBasedHandler
    POST?: RoleBasedHandler
    PUT?: RoleBasedHandler
    PATCH?: RoleBasedHandler
    DELETE?: RoleBasedHandler
  }
): Record<string, (request: NextRequest) => Promise<NextResponse>> {
  const result: Record<
    string,
    (request: NextRequest) => Promise<NextResponse>
  > = {}

  if (handlers.GET) {
    result.GET = requireRole(allowedRoles, handlers.GET)
  }
  if (handlers.POST) {
    result.POST = requireRole(allowedRoles, handlers.POST)
  }
  if (handlers.PUT) {
    result.PUT = requireRole(allowedRoles, handlers.PUT)
  }
  if (handlers.PATCH) {
    result.PATCH = requireRole(allowedRoles, handlers.PATCH)
  }
  if (handlers.DELETE) {
    result.DELETE = requireRole(allowedRoles, handlers.DELETE)
  }

  return result
}
