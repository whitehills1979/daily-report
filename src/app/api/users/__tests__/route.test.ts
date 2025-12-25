import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// hashPasswordのモック
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  }
})

describe('GET /api/users', () => {
  const mockManagerToken = generateToken({
    userId: 10,
    email: 'manager@example.com',
    role: 'manager',
  })

  const mockSalesToken = generateToken({
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('上長がユーザー一覧を取得できる', async () => {
    const mockUsers = [
      {
        id: 1,
        name: '山田太郎',
        email: 'yamada@example.com',
        role: 'sales',
        department: '営業部',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
      {
        id: 2,
        name: '佐藤花子',
        email: 'sato@example.com',
        role: 'sales',
        department: '営業部',
        createdAt: new Date('2025-01-02T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z'),
      },
    ]

    vi.mocked(prisma.user.count).mockResolvedValue(2)
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.users).toHaveLength(2)
    expect(data.data.users[0]).toEqual({
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'sales',
      department: '営業部',
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

  it('役割でフィルタリングできる', async () => {
    const mockUsers = [
      {
        id: 1,
        name: '山田太郎',
        email: 'yamada@example.com',
        role: 'sales',
        department: '営業部',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
    ]

    vi.mocked(prisma.user.count).mockResolvedValue(1)
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

    const request = new NextRequest(
      'http://localhost:3000/api/users?role=sales',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockManagerToken}`,
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.users).toHaveLength(1)
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: 'sales' },
      })
    )
  })

  it('営業ユーザーはアクセスできない（403エラー）', async () => {
    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mockSalesToken}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
  })

  it('未認証ユーザーはアクセスできない（401エラー）', async () => {
    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })
})

describe('POST /api/users', () => {
  const mockManagerToken = generateToken({
    userId: 10,
    email: 'manager@example.com',
    role: 'manager',
  })

  const mockSalesToken = generateToken({
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('上長が新規ユーザーを作成できる', async () => {
    const newUser = {
      id: 3,
      name: '新規太郎',
      email: 'new@example.com',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-03T00:00:00Z'),
      updatedAt: new Date('2025-01-03T00:00:00Z'),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(newUser as any)

    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '新規太郎',
        email: 'new@example.com',
        password: 'Password123',
        role: 'sales',
        department: '営業部',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      id: 3,
      name: '新規太郎',
      email: 'new@example.com',
      role: 'sales',
      department: '営業部',
      createdAt: '2025-01-03T00:00:00.000Z',
      updatedAt: '2025-01-03T00:00:00.000Z',
    })
    expect(hashPassword).toHaveBeenCalledWith('Password123')
  })

  it('メールアドレス重複時はエラーを返す', async () => {
    const existingUser = {
      id: 1,
      email: 'existing@example.com',
      name: '既存ユーザー',
      password: 'hashed',
      role: 'sales' as const,
      department: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any)

    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '新規太郎',
        email: 'existing@example.com',
        password: 'Password123',
        role: 'sales',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('DUPLICATE_ERROR')
    expect(data.error.message).toBe('このメールアドレスは既に登録されています')
  })

  it('パスワードが8文字未満の場合はエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '新規太郎',
        email: 'new@example.com',
        password: 'Pass1',
        role: 'sales',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('パスワードに英数字が含まれていない場合はエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '新規太郎',
        email: 'new@example.com',
        password: 'password',
        role: 'sales',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('営業ユーザーはユーザーを作成できない（403エラー）', async () => {
    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockSalesToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '新規太郎',
        email: 'new@example.com',
        password: 'Password123',
        role: 'sales',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
  })

  it('必須項目が不足している場合はエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '新規太郎',
        email: 'new@example.com',
        // password と role が不足
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })
})
