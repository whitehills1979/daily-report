import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正しいメールアドレスとパスワードでログインに成功する', async () => {
    // パスワードをハッシュ化
    const hashedPassword = await hashPassword('password123')

    // モックユーザーデータ
    const mockUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      password: hashedPassword,
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    // Prismaのモックを設定
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

    // リクエストを作成
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'yamada@example.com',
        password: 'password123',
      }),
    })

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('token')
    expect(data.data.user).toEqual({
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'sales',
      department: '営業部',
    })
    // パスワードがレスポンスに含まれていないことを確認
    expect(data.data.user).not.toHaveProperty('password')
  })

  it('存在しないメールアドレスで401エラーを返す', async () => {
    // ユーザーが見つからない場合
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe(
      'メールアドレスまたはパスワードが正しくありません'
    )
  })

  it('誤ったパスワードで401エラーを返す', async () => {
    const hashedPassword = await hashPassword('correct-password')

    const mockUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      password: hashedPassword,
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'yamada@example.com',
        password: 'wrong-password',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe(
      'メールアドレスまたはパスワードが正しくありません'
    )
  })

  it('メールアドレスが空の場合にバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: '',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('入力値が不正です')
    expect(data.error.details).toBeDefined()
    expect(data.error.details[0].field).toBe('email')
  })

  it('パスワードが空の場合にバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'yamada@example.com',
        password: '',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('入力値が不正です')
    expect(data.error.details).toBeDefined()
    expect(data.error.details[0].field).toBe('password')
  })

  it('メールアドレスの形式が不正な場合にバリデーションエラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('入力値が不正です')
    expect(data.error.details).toBeDefined()
    expect(data.error.details[0].field).toBe('email')
  })

  it('データベースエラー時に500エラーを返す', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(
      new Error('Database connection error')
    )

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'yamada@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('サーバーエラーが発生しました')
  })
})
