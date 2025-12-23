import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
    },
    visitRecord: {
      deleteMany: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('PUT /api/reports/[id]', () => {
  const salesToken = generateToken({
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  })

  const otherUserToken = generateToken({
    userId: 2,
    email: 'other@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TC-REPORT-008: 自分の日報を正常に更新できる', async () => {
    const reportId = 1

    // 既存日報
    const existingReport = {
      id: reportId,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: '旧課題',
      plan: '旧予定',
      createdAt: new Date(),
      updatedAt: new Date(),
      visitRecords: [
        { id: 1 },
        { id: 2 },
      ],
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport)

    // 顧客存在確認
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: 1 },
      { id: 3 },
    ])

    // トランザクション結果
    const updatedReport = {
      id: reportId,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: '新課題',
      plan: '新予定',
      createdAt: new Date('2025-12-18T18:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
      visitRecords: [
        {
          id: 1,
          customerId: 1,
          visitContent: '更新された訪問内容',
          visitTime: '15:00:00',
          durationMinutes: 90,
        },
        {
          id: 3,
          customerId: 3,
          visitContent: '新規訪問記録',
          visitTime: '17:00:00',
          durationMinutes: 30,
        },
      ],
    }

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return await callback(prisma)
    })

    vi.mocked(prisma.dailyReport.update).mockResolvedValue(updatedReport)

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          problem: '新課題',
          plan: '新予定',
          visits: [
            {
              id: 1,
              customer_id: 1,
              visit_content: '更新された訪問内容',
              visit_time: '15:00',
              duration_minutes: 90,
            },
            {
              customer_id: 3,
              visit_content: '新規訪問記録',
              visit_time: '17:00',
              duration_minutes: 30,
            },
          ],
        }),
      }
    )

    const response = await PUT(request, { params: { id: String(reportId) } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.problem).toBe('新課題')
    expect(data.data.plan).toBe('新予定')
    expect(data.data.visits).toHaveLength(2)
    expect(data.data.visits[0].visit_content).toBe('更新された訪問内容')
  })

  it('TC-REPORT-009: 他人の日報を更新しようとすると403エラーを返す', async () => {
    const reportId = 1

    // 他人の日報
    const existingReport = {
      id: reportId,
      userId: 2,
      reportDate: new Date('2025-12-18'),
      problem: null,
      plan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      visitRecords: [],
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport)

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          problem: '更新しようとする',
          visits: [
            {
              customer_id: 1,
              visit_content: 'テスト',
            },
          ],
        }),
      }
    )

    const response = await PUT(request, { params: { id: String(reportId) } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
    expect(data.error.message).toContain('編集する権限がありません')
  })

  it('存在しない日報を更新しようとすると404エラーを返す', async () => {
    const reportId = 999

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          visits: [
            {
              customer_id: 1,
              visit_content: 'テスト',
            },
          ],
        }),
      }
    )

    const response = await PUT(request, { params: { id: String(reportId) } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('日報が見つかりません')
  })

  it('訪問記録なしで更新しようとすると422エラーを返す', async () => {
    const reportId = 1

    const existingReport = {
      id: reportId,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: null,
      plan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      visitRecords: [{ id: 1 }],
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport)

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          problem: '課題',
          visits: [],
        }),
      }
    )

    const response = await PUT(request, { params: { id: String(reportId) } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('存在しない訪問記録IDを指定して更新しようとするとエラーを返す', async () => {
    const reportId = 1

    const existingReport = {
      id: reportId,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: null,
      plan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      visitRecords: [{ id: 1 }, { id: 2 }],
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport)

    vi.mocked(prisma.customer.findMany).mockResolvedValue([{ id: 1 }])

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          visits: [
            {
              id: 999,
              customer_id: 1,
              visit_content: '存在しない訪問記録ID',
            },
          ],
        }),
      }
    )

    const response = await PUT(request, { params: { id: String(reportId) } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('存在しない訪問記録')
  })

  it('不正な日報IDでリクエストすると422エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/reports/invalid',
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          visits: [
            {
              customer_id: 1,
              visit_content: 'テスト',
            },
          ],
        }),
      }
    )

    const response = await PUT(request, { params: { id: 'invalid' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('日報IDが不正です')
  })
})

describe('DELETE /api/reports/[id]', () => {
  const salesToken = generateToken({
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TC-REPORT-010: 自分の日報を正常に削除できる', async () => {
    const reportId = 1

    const existingReport = {
      id: reportId,
      userId: 1,
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport)
    vi.mocked(prisma.dailyReport.delete).mockResolvedValue({
      id: reportId,
      userId: 1,
      reportDate: new Date(),
      problem: null,
      plan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: String(reportId) } })

    expect(response.status).toBe(204)
    expect(prisma.dailyReport.delete).toHaveBeenCalledWith({
      where: { id: reportId },
    })
  })

  it('他人の日報を削除しようとすると403エラーを返す', async () => {
    const reportId = 1

    // 他人の日報
    const existingReport = {
      id: reportId,
      userId: 2,
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport)

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: String(reportId) } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
    expect(data.error.message).toContain('削除する権限がありません')
  })

  it('存在しない日報を削除しようとすると404エラーを返す', async () => {
    const reportId = 999

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    const request = new NextRequest(
      `http://localhost:3000/api/reports/${reportId}`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: String(reportId) } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('日報が見つかりません')
  })

  it('不正な日報IDでリクエストすると422エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/reports/invalid',
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${salesToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: 'invalid' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('日報IDが不正です')
  })

  it('認証トークンがない場合に401エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/reports/1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})
