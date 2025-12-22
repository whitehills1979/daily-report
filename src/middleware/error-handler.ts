/**
 * グローバルエラーハンドラー
 */

import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { errorResponse } from '@/lib/api-response';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * エラーハンドラー
 * API Routeで発生したエラーを適切なレスポンスに変換する
 *
 * @param error エラーオブジェクト
 * @returns NextResponse
 */
export function handleError(error: unknown): NextResponse {
  // 開発環境ではコンソールにエラーログを出力
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }

  // ApiErrorの場合
  if (error instanceof ApiError) {
    return NextResponse.json(
      errorResponse(error.code, error.message, error.details),
      { status: error.statusCode }
    );
  }

  // Zodバリデーションエラーの場合
  if (error instanceof ZodError) {
    const details = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return NextResponse.json(
      errorResponse(
        'VALIDATION_ERROR',
        '入力値が不正です',
        details
      ),
      { status: 422 }
    );
  }

  // Prisma Unique制約エラーの場合
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        errorResponse('DUPLICATE_ERROR', '既に登録されています'),
        { status: 422 }
      );
    }

    // Prisma Not Found エラーの場合
    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse('NOT_FOUND', 'リソースが見つかりません'),
        { status: 404 }
      );
    }
  }

  // その他のエラーは500エラーとして扱う
  return NextResponse.json(
    errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
    { status: 500 }
  );
}

/**
 * API Route用のエラーハンドリングラッパー
 * try-catchを使わずにエラーハンドリングができる
 *
 * @param handler APIハンドラー関数
 * @returns ラップされたハンドラー関数
 *
 * @example
 * export const GET = withErrorHandler(async (request: NextRequest) => {
 *   const data = await fetchData();
 *   return NextResponse.json(successResponse(data));
 * });
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  }) as T;
}
