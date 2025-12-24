import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('GET /api/customers/:id', () => {
  const mockToken = generateToken({
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('顧客詳細を正常に取得できる', async () => {
    const mockCustomer = {
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: '03-1234-5678',
      email: 'tanaka@abc.co.jp',
      address: '東京都千代田区',
      notes: '重要顧客',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer)

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await GET(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: '03-1234-5678',
      email: 'tanaka@abc.co.jp',
      address: '東京都千代田区',
      notes: '重要顧客',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    })
  })

  it('存在しない顧客IDで404エラーを返す', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3000/api/customers/999',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await GET(request, { params: { id: '999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('顧客が見つかりません')
  })

  it('無効な顧客IDで422エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/customers/invalid',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await GET(request, { params: { id: 'invalid' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('無効な顧客IDです')
  })

  it('負の数の顧客IDで422エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/customers/-1',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await GET(request, { params: { id: '-1' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('認証なしで401エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'GET',
      }
    )

    const response = await GET(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})

describe('PUT /api/customers/:id', () => {
  const mockToken = generateToken({
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('顧客情報を正常に更新できる', async () => {
    const existingCustomer = {
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: '03-1234-5678',
      email: 'tanaka@abc.co.jp',
      address: '東京都千代田区',
      notes: '重要顧客',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    const updatedData = {
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: '03-9999-8888', // 変更
      email: 'tanaka.new@abc.co.jp', // 変更
      address: '東京都千代田区丸の内1-1-1', // 変更
      notes: '重要顧客。次回アポ: 2026-01-15', // 変更
    }

    const mockUpdatedCustomer = {
      ...existingCustomer,
      ...updatedData,
      updatedAt: new Date('2025-01-02T00:00:00Z'),
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(existingCustomer)
    vi.mocked(prisma.customer.update).mockResolvedValue(mockUpdatedCustomer)

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      }
    )

    const response = await PUT(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.phone).toBe('03-9999-8888')
    expect(data.data.email).toBe('tanaka.new@abc.co.jp')
    expect(data.data.notes).toContain('次回アポ: 2026-01-15')

    // Prismaが正しいデータで呼ばれたことを確認
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: '田中一郎',
        companyName: '株式会社ABC',
        phone: '03-9999-8888',
        email: 'tanaka.new@abc.co.jp',
        address: '東京都千代田区丸の内1-1-1',
        notes: '重要顧客。次回アポ: 2026-01-15',
      },
    })
  })

  it('存在しない顧客IDで404エラーを返す', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const updatedData = {
      name: '田中一郎',
      companyName: '株式会社ABC',
    }

    const request = new NextRequest(
      'http://localhost:3000/api/customers/999',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      }
    )

    const response = await PUT(request, { params: { id: '999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('顧客が見つかりません')
  })

  it('バリデーションエラーで422エラーを返す', async () => {
    const existingCustomer = {
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: null,
      email: null,
      address: null,
      notes: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(existingCustomer)

    const invalidData = {
      name: '', // 空文字列は不正
      companyName: '株式会社ABC',
    }

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      }
    )

    const response = await PUT(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('無効なメールアドレスで422エラーを返す', async () => {
    const existingCustomer = {
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: null,
      email: null,
      address: null,
      notes: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(existingCustomer)

    const invalidData = {
      name: '田中一郎',
      companyName: '株式会社ABC',
      email: 'invalid-email', // 無効な形式
    }

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      }
    )

    const response = await PUT(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('認証なしで401エラーを返す', async () => {
    const updatedData = {
      name: '田中一郎',
      companyName: '株式会社ABC',
    }

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      }
    )

    const response = await PUT(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})

describe('DELETE /api/customers/:id', () => {
  const mockToken = generateToken({
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未使用の顧客を正常に削除できる', async () => {
    const mockCustomer = {
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: null,
      email: null,
      address: null,
      notes: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      visitRecords: [], // 訪問記録なし
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(prisma.customer.delete).mockResolvedValue(mockCustomer)

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: '1' } })

    expect(response.status).toBe(204)
    expect(prisma.customer.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    })
  })

  it('日報で使用中の顧客は削除できない', async () => {
    const mockCustomer = {
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: null,
      email: null,
      address: null,
      notes: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      visitRecords: [
        {
          id: 1,
          dailyReportId: 1,
          customerId: 1,
          visitContent: 'テスト訪問',
          visitTime: null,
          durationMinutes: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-01T00:00:00Z'),
        },
      ], // 訪問記録あり
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer)

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe(
      'この顧客は日報で使用されているため削除できません'
    )

    // 削除は呼ばれないことを確認
    expect(prisma.customer.delete).not.toHaveBeenCalled()
  })

  it('存在しない顧客IDで404エラーを返す', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3000/api/customers/999',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: '999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('顧客が見つかりません')
  })

  it('無効な顧客IDで422エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/customers/invalid',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: 'invalid' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('Prismaの外部キー制約エラーで422エラーを返す', async () => {
    const mockCustomer = {
      id: 1,
      name: '田中一郎',
      companyName: '株式会社ABC',
      phone: null,
      email: null,
      address: null,
      notes: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      visitRecords: [],
    }

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer)

    // Prismaの外部キー制約エラーをシミュレート
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      {
        code: 'P2003',
        clientVersion: '5.0.0',
      }
    )
    vi.mocked(prisma.customer.delete).mockRejectedValue(prismaError)

    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await DELETE(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe(
      'この顧客は日報で使用されているため削除できません'
    )
  })

  it('認証なしで401エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/customers/1',
      {
        method: 'DELETE',
      }
    )

    const response = await DELETE(request, { params: { id: '1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})
