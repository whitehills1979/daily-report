/**
 * API関連の型定義
 */

import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
} from '@/lib/api-response';

export type { ApiSuccessResponse, ApiErrorResponse, ApiResponse };

/**
 * ページネーションパラメータ
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * ページネーション情報
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

/**
 * ページネーション付きレスポンスデータ
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * ページネーション付き成功レスポンス
 */
export type PaginatedResponse<T> = ApiSuccessResponse<PaginatedData<T>>;
