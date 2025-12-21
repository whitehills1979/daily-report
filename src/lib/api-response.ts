/**
 * API共通レスポンス形式
 */

/**
 * API成功レスポンス型
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

/**
 * APIエラーレスポンス型
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
  };
}

/**
 * APIレスポンス型（成功またはエラー）
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 成功レスポンスを生成
 * @param data レスポンスデータ
 * @returns 成功レスポンス
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * エラーレスポンスを生成
 * @param code エラーコード
 * @param message エラーメッセージ
 * @param details エラー詳細（オプション）
 * @returns エラーレスポンス
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any[]
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}
