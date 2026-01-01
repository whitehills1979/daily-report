/**
 * API クライアント
 * JWTトークンの自動付与、エラーハンドリング、リダイレクト処理を提供
 */

import { ApiResponse, ApiErrorResponse } from './api-response'

/**
 * APIクライアントのエラー
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: any[]
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

/**
 * リクエストオプション
 */
export interface RequestOptions {
  /** 認証トークンを付与するか（デフォルト: true） */
  auth?: boolean
  /** リダイレクトを有効にするか（デフォルト: true） */
  redirect?: boolean
  /** HTTPメソッド */
  method?: string
  /** リクエストボディ */
  body?: string
  /** カスタムヘッダー */
  headers?: Record<string, string>
  /** その他のfetchオプション */
  [key: string]: any
}

/**
 * LocalStorageからJWTトークンを取得
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('auth_token')
}

/**
 * LocalStorageにJWTトークンを保存
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem('auth_token', token)
}

/**
 * LocalStorageからJWTトークンを削除
 */
export function removeToken(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem('auth_token')
}

/**
 * ログイン画面にリダイレクト
 */
function redirectToLogin(): void {
  if (typeof window === 'undefined') {
    return
  }
  // 現在のパスを保存してログイン後にリダイレクトできるようにする
  const currentPath = window.location.pathname
  if (currentPath !== '/login') {
    localStorage.setItem('redirect_after_login', currentPath)
  }
  window.location.href = '/login'
}

/**
 * APIリクエストを実行する基本関数
 */
async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    auth = true,
    redirect = true,
    headers = {},
    ...restOptions
  } = options

  // ヘッダーを構築
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // 認証トークンを付与
  if (auth) {
    const token = getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    })

    // 401エラー時の処理
    if (response.status === 401) {
      if (redirect) {
        removeToken()
        redirectToLogin()
        // リダイレクト後はエラーをスローしない
        throw new ApiClientError(
          'Unauthorized',
          401,
          'UNAUTHORIZED',
          undefined
        )
      }
    }

    // レスポンスボディを取得
    let data: ApiResponse<T>
    try {
      data = await response.json()
    } catch (error) {
      // JSONパースエラー
      throw new ApiClientError(
        'Invalid JSON response',
        response.status,
        'INVALID_RESPONSE',
        undefined
      )
    }

    // エラーレスポンスの処理
    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse
      throw new ApiClientError(
        errorData.error.message,
        response.status,
        errorData.error.code,
        errorData.error.details
      )
    }

    // 成功レスポンスのデータを返す
    return (data as { success: true; data: T }).data
  } catch (error) {
    // ApiClientErrorはそのまま再スロー
    if (error instanceof ApiClientError) {
      throw error
    }

    // ネットワークエラーなどの予期しないエラー
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Unknown error',
      0,
      'NETWORK_ERROR',
      undefined
    )
  }
}

/**
 * GETリクエスト
 */
export async function get<T>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'GET',
  })
}

/**
 * POSTリクエスト
 */
export async function post<T>(
  url: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * PUTリクエスト
 */
export async function put<T>(
  url: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * DELETEリクエスト
 */
export async function del<T>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'DELETE',
  })
}

/**
 * デフォルトエクスポート
 */
const apiClient = {
  get,
  post,
  put,
  delete: del,
  getToken,
  setToken,
  removeToken,
}

export default apiClient
