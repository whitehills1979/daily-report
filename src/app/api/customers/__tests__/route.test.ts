import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('GET /api/customers', () => {
  const mockToken = generateToken({
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('顧客一覧を正常に取得できる', async () => {
    const mockCustomers = [
      {
        id: 1,
        name: '田中一郎',
        companyName: '株式会社ABC',
        phone: '03-1234-5678',
        email: 'tanaka@abc.co.jp',
        address: '東京都千代田区',
        notes: '重要顧客',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
      {
        id: 2,
        name: '佐藤二郎',
        companyName: 'XYZ商事株式会社',
        phone: '03-9876-5432',
        email: 'sato@xyz.co.jp',
        address: '東京都新宿区',
        notes: null,
        createdAt: new Date('2025-01-02T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z'),
      },
    ]

    vi.mocked(prisma.customer.count).mockResolvedValue(2)
    vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers)

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.customers).toHaveLength(2)
    expect(data.data.customers[0]).toEqual({
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
    expect(data.data.pagination).toEqual({
      currentPage: 1,
      perPage: 20,
      totalPages: 1,
      totalCount: 2,
    })
  })

  it('キーワード検索で顧客をフィルタリングできる', async () => {
    const mockCustomers = [
      {
        id: 1,
        name: '田中一郎',
        companyName: '株式会社ABC',
        phone: '03-1234-5678',
        email: 'tanaka@abc.co.jp',
        address: '東京都千代田区',
        notes: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
    ]

    vi.mocked(prisma.customer.count).mockResolvedValue(1)
    vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers)

    const request = new NextRequest(
      'http://localhost:3000/api/customers?keyword=ABC',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.customers).toHaveLength(1)
    expect(data.data.customers[0].companyName).toContain('ABC')

    // Prismaが正しい検索条件で呼ばれたことを確認
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { companyName: { contains: 'ABC', mode: 'insensitive' } },
            { name: { contains: 'ABC', mode: 'insensitive' } },
          ],
        },
      })
    )
  })

  it('ページネーションが正しく機能する', async () => {
    vi.mocked(prisma.customer.count).mockResolvedValue(50)
    vi.mocked(prisma.customer.findMany).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/customers?page=2&per_page=10',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.pagination).toEqual({
      currentPage: 2,
      perPage: 10,
      totalPages: 5,
      totalCount: 50,
    })

    // 正しいskipとtakeで呼ばれたことを確認
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10, // (page 2 - 1) * 10
        take: 10,
      })
    )
  })

  it('認証なしで401エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  it('不正なページ番号でバリデーションエラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/customers?page=0',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/customers', () => {
  const mockToken = generateToken({
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('顧客を正常に作成できる', async () => {
    const newCustomer = {
      name: '山田太郎',
      companyName: 'テスト株式会社',
      phone: '03-1111-2222',
      email: 'yamada@test.co.jp',
      address: '東京都渋谷区',
      notes: 'テストメモ',
    }

    const mockCreatedCustomer = {
      id: 1,
      ...newCustomer,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    vi.mocked(prisma.customer.create).mockResolvedValue(mockCreatedCustomer)

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      id: 1,
      name: '山田太郎',
      companyName: 'テスト株式会社',
      phone: '03-1111-2222',
      email: 'yamada@test.co.jp',
      address: '東京都渋谷区',
      notes: 'テストメモ',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    })

    // Prismaが正しいデータで呼ばれたことを確認
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: {
        name: '山田太郎',
        companyName: 'テスト株式会社',
        phone: '03-1111-2222',
        email: 'yamada@test.co.jp',
        address: '東京都渋谷区',
        notes: 'テストメモ',
      },
    })
  })

  it('必須項目なしで顧客作成に失敗する', async () => {
    const invalidCustomer = {
      phone: '03-1111-2222',
      email: 'test@example.com',
    }

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toBeDefined()
    expect(data.error.details.length).toBeGreaterThan(0)
  })

  it('会社名のみ未入力で422エラーを返す', async () => {
    const invalidCustomer = {
      name: '山田太郎',
      // companyName なし
      phone: '03-1111-2222',
    }

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('入力値が不正です')

    // 会社名フィールドのエラーが含まれていることを確認
    const companyNameError = data.error.details.find(
      (detail: any) => detail.field === 'companyName'
    )
    expect(companyNameError).toBeDefined()
  })

  it('顧客名のみ未入力で422エラーを返す', async () => {
    const invalidCustomer = {
      // name なし
      companyName: 'テスト株式会社',
      phone: '03-1111-2222',
    }

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)

    // 顧客名フィールドのエラーが含まれていることを確認
    const nameError = data.error.details.find(
      (detail: any) => detail.field === 'name'
    )
    expect(nameError).toBeDefined()
  })

  it('無効なメールアドレスで422エラーを返す', async () => {
    const invalidCustomer = {
      name: '山田太郎',
      companyName: 'テスト株式会社',
      email: 'invalid-email', // 無効な形式
    }

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('文字数制限を超えた場合に422エラーを返す', async () => {
    const invalidCustomer = {
      name: 'a'.repeat(101), // 100文字超過
      companyName: 'テスト株式会社',
    }

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('任意項目なしでも顧客を作成できる', async () => {
    const minimalCustomer = {
      name: '山田太郎',
      companyName: 'テスト株式会社',
    }

    const mockCreatedCustomer = {
      id: 1,
      ...minimalCustomer,
      phone: null,
      email: null,
      address: null,
      notes: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    vi.mocked(prisma.customer.create).mockResolvedValue(mockCreatedCustomer)

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.phone).toBeNull()
    expect(data.data.email).toBeNull()
    expect(data.data.address).toBeNull()
    expect(data.data.notes).toBeNull()
  })

  it('認証なしで401エラーを返す', async () => {
    const newCustomer = {
      name: '山田太郎',
      companyName: 'テスト株式会社',
    }

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCustomer),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})
