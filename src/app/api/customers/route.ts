import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { ApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'
import {
  createCustomerSchema,
  customerSearchSchema,
  type CustomerResponse,
  type CustomerListResponse,
} from '@/schemas/customer.schema'

/**
 * GET /api/customers
 * 顧客一覧取得・検索
 *
 * クエリパラメータ:
 * - keyword: 検索キーワード（会社名・顧客名の部分一致）
 * - page: ページ番号（デフォルト: 1）
 * - per_page: 1ページあたりの件数（デフォルト: 20、最大: 100）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    requireAuth(request)
    // クエリパラメータを取得してバリデーション
    const { searchParams } = new URL(request.url)
    const validatedParams = customerSearchSchema.parse({
      keyword: searchParams.get('keyword'),
      page: searchParams.get('page'),
      per_page: searchParams.get('per_page'),
    })

    const { keyword, page, per_page } = validatedParams

    // 検索条件を構築
    const whereClause = keyword
      ? {
          OR: [
            { companyName: { contains: keyword, mode: 'insensitive' as const } },
            { name: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // 総件数を取得
    const totalCount = await prisma.customer.count({
      where: whereClause,
    })

    // ページネーション計算
    const totalPages = Math.ceil(totalCount / per_page)
    const skip = (page - 1) * per_page

    // 顧客一覧を取得
    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: per_page,
    })

    // レスポンスデータを構築
    const customerList: CustomerResponse[] = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    }))

    const responseData: CustomerListResponse = {
      customers: customerList,
      pagination: {
        currentPage: page,
        perPage: per_page,
        totalPages,
        totalCount,
      },
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
    console.error('Get customers error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}

/**
 * POST /api/customers
 * 顧客作成
 *
 * リクエストボディ:
 * - name: 顧客名（必須、100文字以内）
 * - companyName: 会社名（必須、200文字以内）
 * - phone: 電話番号（任意、20文字以内）
 * - email: メールアドレス（任意、形式チェック）
 * - address: 住所（任意、500文字以内）
 * - notes: 備考（任意、1000文字以内）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    requireAuth(request)
    // リクエストボディを取得してバリデーション
    const body = await request.json()
    const validatedData = createCustomerSchema.parse(body)

    // 顧客を作成
    const customer = await prisma.customer.create({
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

    return NextResponse.json(successResponse(responseData), { status: 201 })
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
    console.error('Create customer error:', error)
    return NextResponse.json(
      errorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました'),
      { status: 500 }
    )
  }
}
