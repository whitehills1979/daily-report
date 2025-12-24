import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import {
  updateCustomerSchema,
  type CustomerResponse,
} from '@/schemas/customer.schema'

/**
 * GET /api/customers/:id
 * 顧客詳細取得
 *
 * パスパラメータ:
 * - id: 顧客ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    requireAuth(request)

    const customerId = parseInt(params.id, 10)

    // IDのバリデーション
    if (isNaN(customerId) || customerId <= 0) {
      throw ApiError.validationError('無効な顧客IDです')
    }

    // 顧客を取得
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      throw ApiError.notFound('顧客が見つかりません')
    }

    // レスポンスデータを構築
    const responseData: CustomerResponse = {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    }

    return NextResponse.json(successResponse(responseData), { status: 200 })
  } catch (error: any) {
    // カスタムAPIエラー
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // requireAuthから投げられたエラーオブジェクトの場合
    if (error && typeof error === 'object' && 'statusCode' in error && 'code' in error) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // 予期しないエラー
    console.error('Get customer error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}

/**
 * PUT /api/customers/:id
 * 顧客更新
 *
 * パスパラメータ:
 * - id: 顧客ID
 *
 * リクエストボディ:
 * - name: 顧客名（必須、100文字以内）
 * - companyName: 会社名（必須、200文字以内）
 * - phone: 電話番号（任意、20文字以内）
 * - email: メールアドレス（任意、形式チェック）
 * - address: 住所（任意、500文字以内）
 * - notes: 備考（任意、1000文字以内）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    requireAuth(request)

    const customerId = parseInt(params.id, 10)

    // IDのバリデーション
    if (isNaN(customerId) || customerId <= 0) {
      throw ApiError.validationError('無効な顧客IDです')
    }

    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = updateCustomerSchema.parse(body)

    // 顧客の存在確認
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!existingCustomer) {
      throw ApiError.notFound('顧客が見つかりません')
    }

    // 顧客を更新
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: validatedData.name,
        companyName: validatedData.companyName,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        notes: validatedData.notes || null,
      },
    })

    // レスポンスデータを構築
    const responseData: CustomerResponse = {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    }

    return NextResponse.json(successResponse(responseData), { status: 200 })
  } catch (error: any) {
    // Zodバリデーションエラー
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      return NextResponse.json(
        errorResponse('VALIDATION_ERROR', '入力値が不正です', details),
        { status: 422 }
      )
    }

    // カスタムAPIエラー
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // requireAuthから投げられたエラーオブジェクトの場合
    if (error && typeof error === 'object' && 'statusCode' in error && 'code' in error) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // 予期しないエラー
    console.error('Update customer error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/customers/:id
 * 顧客削除
 *
 * パスパラメータ:
 * - id: 顧客ID
 *
 * エラー:
 * - 日報で使用されている顧客は削除不可（422エラー）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    requireAuth(request)

    const customerId = parseInt(params.id, 10)

    // IDのバリデーション
    if (isNaN(customerId) || customerId <= 0) {
      throw ApiError.validationError('無効な顧客IDです')
    }

    // 顧客の存在確認
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        visitRecords: true,
      },
    })

    if (!customer) {
      throw ApiError.notFound('顧客が見つかりません')
    }

    // 訪問記録で使用されているかチェック
    if (customer.visitRecords.length > 0) {
      throw ApiError.validationError(
        'この顧客は日報で使用されているため削除できません'
      )
    }

    // 顧客を削除
    await prisma.customer.delete({
      where: { id: customerId },
    })

    // 204 No Content を返す
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    // Prismaの外部キー制約エラー
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          errorResponse(
            'VALIDATION_ERROR',
            'この顧客は日報で使用されているため削除できません'
          ),
          { status: 422 }
        )
      }
    }

    // カスタムAPIエラー
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // requireAuthから投げられたエラーオブジェクトの場合
    if (error && typeof error === 'object' && 'statusCode' in error && 'code' in error) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      )
    }

    // 予期しないエラー
    console.error('Delete customer error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}
