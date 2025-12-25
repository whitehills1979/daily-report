/**
 * ダッシュボードAPI テスト
 * GET /api/dashboard
 *
 * テスト観点:
 * 1. 営業ユーザー: 今日の日報状況 + 直近10件の日報を取得
 * 2. 上長ユーザー: 今日の日報状況 + 承認待ち日報を取得
 * 3. 認証エラーのハンドリング
 * 4. データベースエラーのハンドリング
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import * as authMiddleware from '@/middleware/auth'
import { ApiError } from '@/lib/api-error'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

// 認証ミドルウェアのモック
vi.mock('@/middleware/auth', () => ({
  requireAuth: vi.fn(),
}))

describe('GET /api/dashboard - ダッシュボード情報取得API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 現在日時のモック（2025-12-18）
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-18T10:00:00Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('営業ユーザーのダッシュボード', () => {
    it('営業ユーザーが今日の日報作成済みの場合、has_report=true、report_idが設定される', async () => {
      // Given: 営業ユーザーでログイン、今日の日報が存在
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      // 今日の日報が存在
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue({
        id: 100,
      } as any)

      // 最近の日報データ
      const mockRecentReports = [
        {
          id: 100,
          reportDate: new Date('2025-12-18'),
          visitRecords: [{ id: 1 }, { id: 2 }],
          comments: [{ id: 1 }],
        },
        {
          id: 99,
          reportDate: new Date('2025-12-17'),
          visitRecords: [{ id: 3 }],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockRecentReports as any)

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 成功レスポンス、今日の日報が作成済みと表示
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.today).toEqual({
        date: '2025-12-18',
        has_report: true,
        report_id: 100,
      })
      expect(data.data.recent_reports).toHaveLength(2)
      expect(data.data.recent_reports[0]).toEqual({
        id: 100,
        report_date: '2025-12-18',
        visit_count: 2,
        comment_count: 1,
      })
      expect(data.data.recent_reports[1]).toEqual({
        id: 99,
        report_date: '2025-12-17',
        visit_count: 1,
        comment_count: 0,
      })

      // pending_reportsは営業には含まれない
      expect(data.data.pending_reports).toBeUndefined()

      // 認証チェックが呼ばれたことを確認
      expect(authMiddleware.requireAuth).toHaveBeenCalledWith(request)

      // 今日の日報チェックが正しく呼ばれたことを確認
      expect(prisma.dailyReport.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 1,
          reportDate: new Date('2025-12-18'),
        },
        select: {
          id: true,
        },
      })

      // 最近の日報取得が正しく呼ばれたことを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
        },
        include: {
          visitRecords: {
            select: {
              id: true,
            },
          },
          comments: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          reportDate: 'desc',
        },
        take: 10,
      })
    })

    it('営業ユーザーが今日の日報未作成の場合、has_report=false、report_id=nullとなる', async () => {
      // Given: 営業ユーザーでログイン、今日の日報が存在しない
      const mockUser = {
        userId: 2,
        email: 'sales2@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      // 今日の日報が存在しない
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)

      // 過去の日報のみ
      const mockRecentReports = [
        {
          id: 50,
          reportDate: new Date('2025-12-17'),
          visitRecords: [{ id: 1 }],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockRecentReports as any)

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 今日の日報は未作成と表示
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.today).toEqual({
        date: '2025-12-18',
        has_report: false,
        report_id: null,
      })
      expect(data.data.recent_reports).toHaveLength(1)
      expect(data.data.recent_reports[0].id).toBe(50)
    })

    it('営業ユーザーが日報を10件以上持っている場合、直近10件のみ取得する', async () => {
      // Given: 営業ユーザーで多数の日報がある
      const mockUser = {
        userId: 3,
        email: 'sales3@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)

      // 10件の日報を生成
      const mockRecentReports = Array.from({ length: 10 }, (_, i) => ({
        id: 100 - i,
        reportDate: new Date(`2025-12-${18 - i}`),
        visitRecords: [{ id: i + 1 }],
        comments: [],
      }))

      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockRecentReports as any)

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 10件まで取得される
      expect(response.status).toBe(200)
      expect(data.data.recent_reports).toHaveLength(10)
      expect(data.data.recent_reports[0].id).toBe(100)
      expect(data.data.recent_reports[9].id).toBe(91)

      // take: 10が指定されたことを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      )
    })

    it('営業ユーザーの日報が0件の場合、空配列が返る', async () => {
      // Given: 営業ユーザーで日報が1件もない
      const mockUser = {
        userId: 4,
        email: 'sales4@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue([])

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 空の配列が返る
      expect(response.status).toBe(200)
      expect(data.data.recent_reports).toEqual([])
      expect(data.data.today.has_report).toBe(false)
    })
  })

  describe('上長ユーザーのダッシュボード', () => {
    it('上長ユーザーは承認待ち日報（コメント0件）の一覧を取得できる', async () => {
      // Given: 上長ユーザーでログイン
      const mockUser = {
        userId: 10,
        email: 'manager@test.com',
        role: 'manager' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      // 上長の今日の日報は存在しない
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)

      // 承認待ち日報（コメント0件の日報）
      const mockPendingReports = [
        {
          id: 200,
          reportDate: new Date('2025-12-18'),
          user: { id: 1, name: '山田太郎' },
          visitRecords: [{ id: 1 }, { id: 2 }],
          comments: [],
        },
        {
          id: 201,
          reportDate: new Date('2025-12-18'),
          user: { id: 2, name: '佐藤花子' },
          visitRecords: [{ id: 3 }, { id: 4 }, { id: 5 }],
          comments: [],
        },
        {
          id: 199,
          reportDate: new Date('2025-12-17'),
          user: { id: 3, name: '鈴木一郎' },
          visitRecords: [{ id: 6 }],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockPendingReports as any)

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 承認待ち日報が取得される
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.today).toEqual({
        date: '2025-12-18',
        has_report: false,
        report_id: null,
      })
      expect(data.data.recent_reports).toEqual([])
      expect(data.data.pending_reports).toHaveLength(3)
      expect(data.data.pending_reports[0]).toEqual({
        id: 200,
        user: { id: 1, name: '山田太郎' },
        report_date: '2025-12-18',
        visit_count: 2,
        comment_count: 0,
      })
      expect(data.data.pending_reports[1]).toEqual({
        id: 201,
        user: { id: 2, name: '佐藤花子' },
        report_date: '2025-12-18',
        visit_count: 3,
        comment_count: 0,
      })
      expect(data.data.pending_reports[2]).toEqual({
        id: 199,
        user: { id: 3, name: '鈴木一郎' },
        report_date: '2025-12-17',
        visit_count: 1,
        comment_count: 0,
      })

      // 承認待ち日報取得が正しく呼ばれたことを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith({
        where: {
          comments: {
            none: {},
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          visitRecords: {
            select: {
              id: true,
            },
          },
          comments: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          reportDate: 'desc',
        },
      })
    })

    it('上長ユーザーの場合、recent_reportsは空配列となる', async () => {
      // Given: 上長ユーザー
      const mockUser = {
        userId: 11,
        email: 'manager2@test.com',
        role: 'manager' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue([])

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: recent_reportsは空配列
      expect(response.status).toBe(200)
      expect(data.data.recent_reports).toEqual([])
      expect(data.data.pending_reports).toEqual([])
    })

    it('上長ユーザーも自分の今日の日報状況が取得できる', async () => {
      // Given: 上長ユーザーで今日の日報を作成済み
      const mockUser = {
        userId: 12,
        email: 'manager3@test.com',
        role: 'manager' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      // 上長も今日の日報を作成している
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue({
        id: 300,
      } as any)

      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue([])

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 今日の日報状況が正しく返る
      expect(response.status).toBe(200)
      expect(data.data.today).toEqual({
        date: '2025-12-18',
        has_report: true,
        report_id: 300,
      })
    })
  })

  describe('認証・権限のエラーケース', () => {
    it('認証トークンがない場合、401エラーが返る', async () => {
      // Given: 認証エラーをスロー
      const authError = ApiError.unauthorized('認証が必要です')
      vi.mocked(authMiddleware.requireAuth).mockImplementation(() => {
        throw authError
      })

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 401エラー
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('認証が必要です')
    })

    it('無効なトークンの場合、401エラーが返る', async () => {
      // Given: 無効なトークンエラー
      const authError = ApiError.unauthorized('トークンが無効です')
      vi.mocked(authMiddleware.requireAuth).mockImplementation(() => {
        throw authError
      })

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 401エラー
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('データベースエラーのハンドリング', () => {
    it('今日の日報取得時にDBエラーが発生した場合、500エラーが返る', async () => {
      // Given: 認証成功、DBエラー発生
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      )

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 500エラー
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('サーバーエラーが発生しました')
    })

    it('最近の日報取得時にDBエラーが発生した場合、500エラーが返る', async () => {
      // Given: 認証成功、今日の日報は取得成功、最近の日報でDBエラー
      const mockUser = {
        userId: 2,
        email: 'sales2@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.dailyReport.findMany).mockRejectedValue(
        new Error('Query timeout')
      )

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 500エラー
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('エッジケース', () => {
    it('訪問記録0件、コメント0件の日報が正しく集計される', async () => {
      // Given: 営業ユーザー、訪問記録・コメントが0件の日報
      const mockUser = {
        userId: 5,
        email: 'sales5@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null)

      const mockRecentReports = [
        {
          id: 150,
          reportDate: new Date('2025-12-18'),
          visitRecords: [],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockRecentReports as any)

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 訪問件数・コメント件数が0として正しく返る
      expect(response.status).toBe(200)
      expect(data.data.recent_reports[0]).toEqual({
        id: 150,
        report_date: '2025-12-18',
        visit_count: 0,
        comment_count: 0,
      })
    })

    it('日付フォーマットが正しくYYYY-MM-DD形式で返される', async () => {
      // Given: 営業ユーザー
      const mockUser = {
        userId: 6,
        email: 'sales6@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findFirst).mockResolvedValue({
        id: 160,
      } as any)

      const mockRecentReports = [
        {
          id: 160,
          reportDate: new Date('2025-12-18T23:59:59Z'),
          visitRecords: [],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockRecentReports as any)

      // When: APIをコール
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Then: 日付がYYYY-MM-DD形式で返る
      expect(data.data.today.date).toBe('2025-12-18')
      expect(data.data.recent_reports[0].report_date).toBe('2025-12-18')
      expect(data.data.today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
