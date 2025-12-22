/**
 * APIカスタムエラークラスとエラーコード定義
 */

/**
 * エラーコード定数
 */
export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * APIカスタムエラークラス
 */
export class ApiError extends Error {
  /**
   * @param statusCode HTTPステータスコード
   * @param code エラーコード
   * @param message エラーメッセージ
   * @param details エラー詳細（オプション）
   */
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any[]
  ) {
    super(message);
    this.name = 'ApiError';

    // プロトタイプチェーンを正しく設定（TypeScriptのクラス継承の問題対策）
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * 認証エラー（401 Unauthorized）
   * @param message エラーメッセージ
   * @returns ApiErrorインスタンス
   */
  static unauthorized(message = '認証が必要です'): ApiError {
    return new ApiError(401, ErrorCode.UNAUTHORIZED, message);
  }

  /**
   * 権限エラー（403 Forbidden）
   * @param message エラーメッセージ
   * @returns ApiErrorインスタンス
   */
  static forbidden(message = 'アクセス権限がありません'): ApiError {
    return new ApiError(403, ErrorCode.FORBIDDEN, message);
  }

  /**
   * リソース未検出エラー（404 Not Found）
   * @param message エラーメッセージ
   * @returns ApiErrorインスタンス
   */
  static notFound(message = 'リソースが見つかりません'): ApiError {
    return new ApiError(404, ErrorCode.NOT_FOUND, message);
  }

  /**
   * バリデーションエラー（422 Unprocessable Entity）
   * @param message エラーメッセージ
   * @param details バリデーションエラー詳細
   * @returns ApiErrorインスタンス
   */
  static validationError(message: string, details?: any[]): ApiError {
    return new ApiError(422, ErrorCode.VALIDATION_ERROR, message, details);
  }

  /**
   * 重複エラー（422 Unprocessable Entity）
   * @param message エラーメッセージ
   * @returns ApiErrorインスタンス
   */
  static duplicateError(message = '既に登録されています'): ApiError {
    return new ApiError(422, ErrorCode.DUPLICATE_ERROR, message);
  }

  /**
   * サーバー内部エラー（500 Internal Server Error）
   * @param message エラーメッセージ
   * @returns ApiErrorインスタンス
   */
  static internalError(message = 'サーバーエラーが発生しました'): ApiError {
    return new ApiError(500, ErrorCode.INTERNAL_ERROR, message);
  }
}
