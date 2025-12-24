import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { prisma } from '@/lib/prisma'
import * as authMiddleware from '@/middleware/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findUnique: vi.fn(),
    },
  },
}))

// 認証ミドルウェアのモック
vi.mock('@/middleware/auth', () => ({
  requireAuth: vi.fn(),
}))

describe('GET /api/reports/:id - 日報詳細取得API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('正常系: 日報詳細の取得', () => {
    it('営業ユーザーは自分の日報詳細を取得できる', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const mockReport = {
        id: 1,
        userId: 1,
        reportDate: new Date('2025-12-18'),
        problem: 'ABC社の決裁フローが長く、受注までの期間短縮方法を相談したい。',
        plan: '・ABC社のキーマンリサーチ\n・XYZ商事への見積書作成',
        createdAt: new Date('2025-12-18T09:00:00Z'),
        updatedAt: new Date('2025-12-18T09:00:00Z'),
        user: {
          id: 1,
          name: '山田太郎',
          department: '営業部',
        },
        visitRecords: [
          {
            id: 1,
            visitContent: '新商品の提案を実施。好感触で、次回見積提示の約束を取り付けた。',
            visitTime: new Date('1970-01-01T14:00:00Z'),
            durationMinutes: 60,
            createdAt: new Date('2025-12-18T09:00:00Z'),
            customer: {
              id: 1,
              name: '田中一郎',
              companyName: '株式会社ABC',
            },
          },
          {
            id: 2,
            visitContent: '既存契約の更新について打ち合わせ。',
            visitTime: new Date('1970-01-01T16:00:00Z'),
            durationMinutes: 45,
            createdAt: new Date('2025-12-18T09:00:00Z'),
            customer: {
              id: 2,
              name: '鈴木次郎',
              companyName: 'XYZ商事株式会社',
            },
          },
        ],
        comments: [
          {
            id: 1,
            commentType: 'problem',
            content: 'キーマンを特定して直接アプローチを検討しましょう。',
            createdAt: new Date('2025-12-18T10:00:00Z'),
            user: {
              id: 10,
              name: '佐藤部長',
              role: 'manager',
            },
          },
        ],
      }

      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(mockReport as any)

      const request = new NextRequest('http://localhost:3000/api/reports/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(1)
      expect(data.data.user.id).toBe(1)
      expect(data.data.user.name).toBe('山田太郎')
      expect(data.data.user.department).toBe('営業部')
      expect(data.data.report_date).toBe('2025-12-18')
      expect(data.data.problem).toBe('ABC社の決裁フローが長く、受注までの期間短縮方法を相談したい。')
      expect(data.data.plan).toBe('・ABC社のキーマンリサーチ\n・XYZ商事への見積書作成')
      expect(data.data.visits).toHaveLength(2)
      expect(data.data.visits[0].customer.name).toBe('田中一郎')
      expect(data.data.visits[0].customer.company_name).toBe('株式会社ABC')
      expect(data.data.visits[0].visit_content).toBe(
        '新商品の提案を実施。好感触で、次回見積提示の約束を取り付けた。'
      )
      expect(data.data.visits[0].visit_time).toBe('14:00:00')
      expect(data.data.visits[0].duration_minutes).toBe(60)
      expect(data.data.comments).toHaveLength(1)
      expect(data.data.comments[0].user.name).toBe('佐藤部長')
      expect(data.data.comments[0].comment_type).toBe('problem')
      expect(data.data.comments[0].content).toBe('キーマンを特定して直接アプローチを検討しましょう。')
    })

    it('上長ユーザーは全メンバーの日報詳細を取得できる', async () => {
      const mockUser = {
        userId: 10,
        email: 'manager@test.com',
        role: 'manager' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const mockReport = {
        id: 5,
        userId: 2,
        reportDate: new Date('2025-12-17'),
        problem: null,
        plan: null,
        createdAt: new Date('2025-12-17T09:00:00Z'),
        updatedAt: new Date('2025-12-17T09:00:00Z'),
        user: {
          id: 2,
          name: '佐藤花子',
          department: '営業部',
        },
        visitRecords: [
          {
            id: 10,
            visitContent: '顧客訪問',
            visitTime: null,
            durationMinutes: null,
            createdAt: new Date('2025-12-17T09:00:00Z'),
            customer: {
              id: 3,
              name: '高橋三郎',
              companyName: 'テスト株式会社',
            },
          },
        ],
        comments: [],
      }

      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(mockReport as any)

      const request = new NextRequest('http://localhost:3000/api/reports/5')
      const response = await GET(request, { params: { id: '5' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(5)
      expect(data.data.user.name).toBe('佐藤花子')
      expect(data.data.visits[0].visit_time).toBe(null)
      expect(data.data.visits[0].duration_minutes).toBe(null)
    })
  })

  describe('異常系: 権限エラー', () => {
    it('営業ユーザーは他人の日報詳細を取得できない', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const mockReport = {
        id: 2,
        userId: 2, // 別のユーザーの日報
        reportDate: new Date('2025-12-18'),
        problem: null,
        plan: null,
        createdAt: new Date('2025-12-18T09:00:00Z'),
        updatedAt: new Date('2025-12-18T09:00:00Z'),
        user: {
          id: 2,
          name: '佐藤花子',
          department: '営業部',
        },
        visitRecords: [],
        comments: [],
      }

      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(mockReport as any)

      const request = new NextRequest('http://localhost:3000/api/reports/2')
      const response = await GET(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('この日報を閲覧する権限がありません')
    })
  })

  describe('異常系: 存在しない日報ID', () => {
    it('存在しない日報IDで404エラーが返される', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/reports/9999')
      const response = await GET(request, { params: { id: '9999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('日報が見つかりません')
    })
  })

  describe('異常系: 不正なIDパラメータ', () => {
    it('不正なID形式でバリデーションエラーが返される', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/reports/invalid')
      const response = await GET(request, { params: { id: 'invalid' } })
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('不正な日報IDです')
    })

    it('0以下のIDでバリデーションエラーが返される', async () => {
      const mockUser = {
        userId: 1,
        email: 'sales@test.com',
        role: 'sales' as const,
      }

      vi.mocked(authMiddleware.requireAuth).mockReturnValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/reports/0')
      const response = await GET(request, { params: { id: '0' } })
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('異常系: 認証エラー', () => {
    it('認証されていない場合はエラーが返される', async () => {
      vi.mocked(authMiddleware.requireAuth).mockImplementation(() => {
        throw {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        }
      })

      const request = new NextRequest('http://localhost:3000/api/reports/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })
})
