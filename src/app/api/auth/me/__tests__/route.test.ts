import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'
import { generateToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーの情報を正しく取得できる', async () => {
    // モックユーザーデータ
    const mockUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      password: 'hashed-password',
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    })

    // 有効なトークンを生成
    const token = generateToken({
      userId: 1,
      email: 'yamada@example.com',
      role: 'sales',
    })

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'sales',
      department: '営業部',
      created_at: '2025-01-01T00:00:00.000Z',
    })
    // パスワードがレスポンスに含まれていないことを確認
    expect(data.data).not.toHaveProperty('password')
  })

  it('認証トークンがない場合に401エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe('認証が必要です')
  })

  it('無効なトークンで401エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe('トークンが無効です')
  })

  it('ユーザーが存在しない場合に404エラーを返す', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const token = generateToken({
      userId: 999,
      email: 'deleted@example.com',
      role: 'sales',
    })

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('ユーザーが見つかりません')
  })

  it('managerロールのユーザー情報を正しく取得できる', async () => {
    const mockUser = {
      id: 10,
      name: '佐藤部長',
      email: 'sato@example.com',
      role: 'manager' as const,
      department: '営業1部',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      password: 'hashed-password',
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    })

    const token = generateToken({
      userId: 10,
      email: 'sato@example.com',
      role: 'manager',
    })

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.role).toBe('manager')
    expect(data.data.name).toBe('佐藤部長')
  })

  it('データベースエラー時に500エラーを返す', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(
      new Error('Database connection error')
    )

    const token = generateToken({
      userId: 1,
      email: 'yamada@example.com',
      role: 'sales',
    })

    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('サーバーエラーが発生しました')
  })
})
