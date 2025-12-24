import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import * as authMiddleware from '@/middleware/auth'
import { generateToken } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
    },
  },
}))

// 認証ミドルウェアのモック
vi.mock('@/middleware/auth', () => ({
  requireAuth: vi.fn(),
}))

describe('GET /api/reports - 日報一覧取得API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TC-REPORT-012: 営業ユーザーが自分の日報一覧を表示', () => {
    it('営業ユーザーは自分の日報のみ取得できる', async () => {
      // モックの設定
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const mockReports = [
        {
          id: 1,
          userId: 1,
          reportDate: new Date('2025-12-18'),
          problem: 'テスト課題1',
          plan: 'テスト予定1',
          createdAt: new Date('2025-12-18T09:00:00Z'),
          updatedAt: new Date('2025-12-18T09:00:00Z'),
          user: { id: 1, name: '山田太郎' },
          visitRecords: [{ id: 1 }, { id: 2 }],
          comments: [{ id: 1 }],
        },
        {
          id: 2,
          userId: 1,
          reportDate: new Date('2025-12-17'),
          problem: 'テスト課題2',
          plan: 'テスト予定2',
          createdAt: new Date('2025-12-17T09:00:00Z'),
          updatedAt: new Date('2025-12-17T09:00:00Z'),
          user: { id: 1, name: '山田太郎' },
          visitRecords: [{ id: 3 }],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.count).mockResolvedValue(2)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockReports as any)

      // リクエストの作成
      const request = new NextRequest('http://localhost:3000/api/reports?page=1&per_page=20')

      // APIの実行
      const response = await GET(request)
      const data = await response.json()

      // アサーション
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.reports).toHaveLength(2)
      expect(data.data.reports[0].id).toBe(1)
      expect(data.data.reports[0].user.id).toBe(1)
      expect(data.data.reports[0].user.name).toBe('山田太郎')
      expect(data.data.reports[0].visit_count).toBe(2)
      expect(data.data.reports[0].comment_count).toBe(1)
      expect(data.data.pagination.current_page).toBe(1)
      expect(data.data.pagination.per_page).toBe(20)
      expect(data.data.pagination.total_count).toBe(2)

      // Prismaが正しい条件で呼ばれたことを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
          }),
          orderBy: { reportDate: 'desc' },
        })
      )
    })

    it('営業ユーザーが他人のuser_idを指定するとエラーになる', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/reports?user_id=2')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('自分の日報のみ閲覧できます')
    })
  })

  describe('TC-REPORT-013: 上長ユーザーが全メンバーの日報一覧を表示', () => {
    it('上長ユーザーは全メンバーの日報を取得できる', async () => {
      const mockUser = {
        userId: 10,
        email: 'manager@test.com',
        role: 'manager' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const mockReports = [
        {
          id: 1,
          userId: 1,
          reportDate: new Date('2025-12-18'),
          problem: null,
          plan: null,
          createdAt: new Date('2025-12-18T09:00:00Z'),
          updatedAt: new Date('2025-12-18T09:00:00Z'),
          user: { id: 1, name: '山田太郎' },
          visitRecords: [{ id: 1 }],
          comments: [],
        },
        {
          id: 2,
          userId: 2,
          reportDate: new Date('2025-12-18'),
          problem: null,
          plan: null,
          createdAt: new Date('2025-12-18T10:00:00Z'),
          updatedAt: new Date('2025-12-18T10:00:00Z'),
          user: { id: 2, name: '佐藤花子' },
          visitRecords: [{ id: 2 }],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.count).mockResolvedValue(2)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockReports as any)

      const request = new NextRequest('http://localhost:3000/api/reports')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.reports).toHaveLength(2)
      expect(data.data.reports[0].user.name).toBe('山田太郎')
      expect(data.data.reports[1].user.name).toBe('佐藤花子')

      // user_id条件が含まれていないことを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            userId: expect.anything(),
          }),
        })
      )
    })

    it('上長ユーザーは特定のuser_idで絞り込める', async () => {
      const mockUser = {
        userId: 10,
        email: 'manager@test.com',
        role: 'manager' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const mockReports = [
        {
          id: 1,
          userId: 1,
          reportDate: new Date('2025-12-18'),
          problem: null,
          plan: null,
          createdAt: new Date('2025-12-18T09:00:00Z'),
          updatedAt: new Date('2025-12-18T09:00:00Z'),
          user: { id: 1, name: '山田太郎' },
          visitRecords: [],
          comments: [],
        },
      ]

      vi.mocked(prisma.dailyReport.count).mockResolvedValue(1)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue(mockReports as any)

      const request = new NextRequest('http://localhost:3000/api/reports?user_id=1')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reports).toHaveLength(1)

      // user_id=1で絞り込まれていることを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
          }),
        })
      )
    })
  })

  describe('TC-REPORT-014: 日報検索（期間指定）', () => {
    it('期間を指定して日報を検索できる', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.count).mockResolvedValue(0)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/reports?date_from=2025-12-01&date_to=2025-12-15'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)

      // 期間指定が正しく渡されていることを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reportDate: {
              gte: new Date('2025-12-01'),
              lte: new Date('2025-12-15'),
            },
          }),
        })
      )
    })
  })

  describe('TC-REPORT-015: 日報検索（顧客指定）', () => {
    it('顧客を指定して日報を検索できる', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.count).mockResolvedValue(0)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/reports?customer_id=5')

      const response = await GET(request)

      expect(response.status).toBe(200)

      // 顧客ID条件が正しく渡されていることを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visitRecords: {
              some: {
                customerId: 5,
              },
            },
          }),
        })
      )
    })
  })

  describe('TC-REPORT-016: ページネーション', () => {
    it('ページネーションが正しく機能する', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      // 総件数50件の場合
      vi.mocked(prisma.dailyReport.count).mockResolvedValue(50)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/reports?page=2&per_page=20')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.current_page).toBe(2)
      expect(data.data.pagination.per_page).toBe(20)
      expect(data.data.pagination.total_pages).toBe(3)
      expect(data.data.pagination.total_count).toBe(50)

      // skip=20, take=20で呼ばれていることを確認
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      )
    })

    it('デフォルトのページネーション値が使用される', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.count).mockResolvedValue(10)
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/reports')

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.pagination.current_page).toBe(1)
      expect(data.data.pagination.per_page).toBe(20)

      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      )
    })
  })

  describe('バリデーションエラー', () => {
    it('不正なpage値でバリデーションエラーが発生する', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/reports?page=0')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('不正な日付形式でバリデーションエラーが発生する', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/reports?date_from=invalid-date')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('認証エラー', () => {
    it('認証されていない場合はエラーが返される', async () => {
      vi.mocked(authMiddleware.requireAuth).mockImplementation(() => {
        throw {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        }
      })

      const request = new NextRequest('http://localhost:3000/api/reports')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })
})

describe('POST /api/reports', () => {
  const validToken = generateToken({
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TC-REPORT-001: 正常な日報を作成できる', async () => {
    const reportDate = '2025-12-18'

    // 既存日報なし
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    // 顧客存在確認
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ])

    // 作成成功
    const mockCreatedReport = {
      id: 1,
      userId: 1,
      reportDate: new Date(reportDate),
      problem: 'ABC社の決裁フローが長く、受注までの期間短縮方法を相談したい。',
      plan: '・ABC社のキーマンリサーチ\n・XYZ商事への見積書作成',
      createdAt: new Date('2025-12-18T18:30:00Z'),
      updatedAt: new Date('2025-12-18T18:30:00Z'),
      visitRecords: [
        {
          id: 1,
          customerId: 1,
          visitContent: '新商品の提案を実施。好感触で、次回見積提示の約束を取り付けた。',
          visitTime: '14:00:00',
          durationMinutes: 60,
        },
        {
          id: 2,
          customerId: 2,
          visitContent: '既存契約の更新について打ち合わせ。',
          visitTime: '16:00:00',
          durationMinutes: 45,
        },
      ],
    }

    vi.mocked(prisma.dailyReport.create).mockResolvedValue(mockCreatedReport)

    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: reportDate,
        problem: 'ABC社の決裁フローが長く、受注までの期間短縮方法を相談したい。',
        plan: '・ABC社のキーマンリサーチ\n・XYZ商事への見積書作成',
        visits: [
          {
            customer_id: 1,
            visit_content: '新商品の提案を実施。好感触で、次回見積提示の約束を取り付けた。',
            visit_time: '14:00',
            duration_minutes: 60,
          },
          {
            customer_id: 2,
            visit_content: '既存契約の更新について打ち合わせ。',
            visit_time: '16:00',
            duration_minutes: 45,
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('id', 1)
    expect(data.data.report_date).toBe(reportDate)
    expect(data.data.visits).toHaveLength(2)
    expect(data.data.visits[0].customer_id).toBe(1)
    expect(data.data.visits[0].visit_time).toBe('14:00')
  })

  it('TC-REPORT-003: 訪問記録なしで日報作成を失敗させる', async () => {
    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: '2025-12-18',
        problem: 'テスト課題',
        plan: 'テスト予定',
        visits: [],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toBeDefined()
    expect(data.error.details.some((d: any) => d.field === 'visits')).toBe(true)
    expect(
      data.error.details.some((d: any) =>
        d.message.includes('少なくとも1件追加してください')
      )
    ).toBe(true)
  })

  it('TC-REPORT-004: 訪問内容が未入力の場合にバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: '2025-12-18',
        visits: [
          {
            customer_id: 1,
            visit_content: '',
            visit_time: '14:00',
            duration_minutes: 60,
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toBeDefined()
    expect(
      data.error.details.some((d: any) => d.field.includes('visit_content'))
    ).toBe(true)
  })

  it('TC-REPORT-005: 同じ日付の日報を重複作成できない', async () => {
    const reportDate = '2025-12-18'

    // 既存日報あり
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue({
      id: 999,
      userId: 1,
      reportDate: new Date(reportDate),
      problem: null,
      plan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: reportDate,
        visits: [
          {
            customer_id: 1,
            visit_content: 'テスト訪問内容',
            visit_time: '14:00',
            duration_minutes: 60,
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('既に登録されています')
  })

  it('訪問内容が1000文字を超えるとバリデーションエラーを返す', async () => {
    const longContent = 'あ'.repeat(1001)

    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: '2025-12-18',
        visits: [
          {
            customer_id: 1,
            visit_content: longContent,
            visit_time: '14:00',
            duration_minutes: 60,
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(
      data.error.details.some((d: any) =>
        d.message.includes('1000文字以内で入力してください')
      )
    ).toBe(true)
  })

  it('problemが2000文字を超えるとバリデーションエラーを返す', async () => {
    const longProblem = 'あ'.repeat(2001)

    // 既存日報なし
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: '2025-12-18',
        problem: longProblem,
        visits: [
          {
            customer_id: 1,
            visit_content: 'テスト訪問内容',
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(
      data.error.details.some((d: any) =>
        d.message.includes('2000文字以内で入力してください')
      )
    ).toBe(true)
  })

  it('planが2000文字を超えるとバリデーションエラーを返す', async () => {
    const longPlan = 'あ'.repeat(2001)

    // 既存日報なし
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: '2025-12-18',
        plan: longPlan,
        visits: [
          {
            customer_id: 1,
            visit_content: 'テスト訪問内容',
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(
      data.error.details.some((d: any) =>
        d.message.includes('2000文字以内で入力してください')
      )
    ).toBe(true)
  })

  it('存在しない顧客IDを指定するとバリデーションエラーを返す', async () => {
    // 既存日報なし
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    // 顧客が見つからない
    vi.mocked(prisma.customer.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: '2025-12-18',
        visits: [
          {
            customer_id: 999,
            visit_content: 'テスト訪問内容',
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('存在しない顧客')
  })

  it('認証トークンがない場合に401エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        report_date: '2025-12-18',
        visits: [
          {
            customer_id: 1,
            visit_content: 'テスト訪問内容',
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  it('複数訪問記録を含む日報を作成できる', async () => {
    const reportDate = '2025-12-18'

    // 既存日報なし
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    // 顧客存在確認
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])

    // 作成成功
    const mockCreatedReport = {
      id: 1,
      userId: 1,
      reportDate: new Date(reportDate),
      problem: null,
      plan: null,
      createdAt: new Date('2025-12-18T18:30:00Z'),
      updatedAt: new Date('2025-12-18T18:30:00Z'),
      visitRecords: [
        {
          id: 1,
          customerId: 1,
          visitContent: '訪問1',
          visitTime: null,
          durationMinutes: null,
        },
        {
          id: 2,
          customerId: 2,
          visitContent: '訪問2',
          visitTime: null,
          durationMinutes: null,
        },
        {
          id: 3,
          customerId: 3,
          visitContent: '訪問3',
          visitTime: null,
          durationMinutes: null,
        },
      ],
    }

    vi.mocked(prisma.dailyReport.create).mockResolvedValue(mockCreatedReport)

    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        report_date: reportDate,
        visits: [
          {
            customer_id: 1,
            visit_content: '訪問1',
          },
          {
            customer_id: 2,
            visit_content: '訪問2',
          },
          {
            customer_id: 3,
            visit_content: '訪問3',
          },
        ],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.visits).toHaveLength(3)
  })
})
