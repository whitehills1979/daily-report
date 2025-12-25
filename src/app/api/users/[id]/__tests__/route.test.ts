import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

describe('GET /api/users/:id', () => {
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

  it('上長がユーザー詳細を取得できる', async () => {
    const mockUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
      },
    })

    const response = await GET(request, {
      params: Promise.resolve({ id: '1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'sales',
      department: '営業部',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    })
  })

  it('存在しないユーザーIDの場合は404エラーを返す', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/users/999', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
      },
    })

    const response = await GET(request, {
      params: Promise.resolve({ id: '999' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
  })

  it('営業ユーザーはアクセスできない（403エラー）', async () => {
    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mockSalesToken}`,
      },
    })

    const response = await GET(request, {
      params: Promise.resolve({ id: '1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
  })

  it('無効なユーザーIDの場合は400エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/users/invalid', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
      },
    })

    const response = await GET(request, {
      params: Promise.resolve({ id: 'invalid' }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PUT /api/users/:id', () => {
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

  it('上長がユーザー情報を更新できる', async () => {
    const existingUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      password: 'hashed',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    const updatedUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'manager' as const,
      department: '営業1部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-03T00:00:00Z'),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any)
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any)

    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'manager',
        department: '営業1部',
      }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: '1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.role).toBe('manager')
    expect(data.data.department).toBe('営業1部')
  })

  it('パスワードを変更できる', async () => {
    const existingUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      password: 'old_hashed',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    const updatedUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-03T00:00:00Z'),
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any)
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any)

    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'NewPass123',
      }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: '1' }),
    })

    expect(response.status).toBe(200)
    expect(hashPassword).toHaveBeenCalledWith('NewPass123')
  })

  it('メールアドレス変更時に重複チェックを行う', async () => {
    const existingUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      password: 'hashed',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }

    const duplicateUser = {
      id: 2,
      email: 'duplicate@example.com',
      name: '他のユーザー',
      password: 'hashed',
      role: 'sales' as const,
      department: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(existingUser as any)
      .mockResolvedValueOnce(duplicateUser as any)

    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'duplicate@example.com',
      }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: '1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('DUPLICATE_ERROR')
  })

  it('存在しないユーザーの場合は404エラーを返す', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/users/999', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '更新太郎',
      }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: '999' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
  })

  it('営業ユーザーはユーザーを更新できない（403エラー）', async () => {
    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockSalesToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '更新太郎',
      }),
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: '1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
  })
})

describe('DELETE /api/users/:id', () => {
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

  it('日報のないユーザーを削除できる', async () => {
    const existingUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      password: 'hashed',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      dailyReports: [],
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any)
    vi.mocked(prisma.user.delete).mockResolvedValue(existingUser as any)

    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
      },
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    })

    expect(response.status).toBe(204)
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    })
  })

  it('日報が存在するユーザーは削除できない（422エラー）', async () => {
    const existingUser = {
      id: 1,
      name: '山田太郎',
      email: 'yamada@example.com',
      password: 'hashed',
      role: 'sales' as const,
      department: '営業部',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      dailyReports: [
        {
          id: 1,
          userId: 1,
          reportDate: new Date('2025-01-01'),
          problem: null,
          plan: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any)

    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
      },
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe(
      'このユーザーは日報を作成しているため削除できません'
    )
  })

  it('存在しないユーザーの場合は404エラーを返す', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/users/999', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mockManagerToken}`,
      },
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '999' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
  })

  it('営業ユーザーはユーザーを削除できない（403エラー）', async () => {
    const request = new NextRequest('http://localhost:3000/api/users/1', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mockSalesToken}`,
      },
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: '1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
  })

  it('無効なユーザーIDの場合は400エラーを返す', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/users/invalid',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${mockManagerToken}`,
        },
      }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'invalid' }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })
})
