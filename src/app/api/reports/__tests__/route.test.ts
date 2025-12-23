import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
    },
  },
}))

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
