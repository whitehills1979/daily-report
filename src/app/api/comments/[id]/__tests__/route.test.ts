import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('PUT /api/comments/:id', () => {
  const ownerToken = generateToken({
    userId: 10,
    email: 'manager@test.com',
    role: 'manager',
  })

  const otherUserToken = generateToken({
    userId: 20,
    email: 'other@test.com',
    role: 'manager',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('本人が自分のコメントを更新できる', async () => {
    // モックデータ
    const mockExistingComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: '元のコメント',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
    }

    const mockUpdatedComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: '更新されたコメント内容',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:30:00Z'),
    }

    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockExistingComment)
    vi.mocked(prisma.comment.update).mockResolvedValue(mockUpdatedComment)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          content: '更新されたコメント内容',
        }),
      }
    )

    // APIを実行
    const response = await PUT(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      id: 1,
      content: '更新されたコメント内容',
      updated_at: '2025-12-18T19:30:00.000Z',
    })

    // Prismaが正しく呼ばれたことを確認
    expect(prisma.comment.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    })
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        content: '更新されたコメント内容',
      },
    })
  })

  it('他人のコメントは更新できない（403エラー）', async () => {
    const mockExistingComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: '元のコメント',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
    }

    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockExistingComment)

    // リクエストを作成（別ユーザーのトークン）
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
        },
        body: JSON.stringify({
          content: '更新されたコメント内容',
        }),
      }
    )

    // APIを実行
    const response = await PUT(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
    expect(data.error.message).toBe('他人のコメントは編集できません')

    // updateが呼ばれていないことを確認
    expect(prisma.comment.update).not.toHaveBeenCalled()
  })

  it('存在しないコメントは更新できない（404エラー）', async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/comments/999',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          content: '更新されたコメント内容',
        }),
      }
    )

    // APIを実行
    const response = await PUT(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('コメントが見つかりません')
  })

  it('空のコメントに更新できない（バリデーションエラー）', async () => {
    const mockExistingComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: '元のコメント',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
    }

    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockExistingComment)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          content: '',
        }),
      }
    )

    // APIを実行
    const response = await PUT(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toBeDefined()
    expect(data.error.details[0].field).toBe('content')
    expect(data.error.details[0].message).toBe('コメントを入力してください')
  })

  it('500文字を超えるコメントに更新できない（バリデーションエラー）', async () => {
    const mockExistingComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: '元のコメント',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
    }

    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockExistingComment)

    const longContent = 'あ'.repeat(501)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          content: longContent,
        }),
      }
    )

    // APIを実行
    const response = await PUT(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toBeDefined()
    expect(data.error.details[0].field).toBe('content')
    expect(data.error.details[0].message).toBe(
      'コメントは500文字以内で入力してください'
    )
  })

  it('認証トークンなしではアクセスできない（401エラー）', async () => {
    // リクエストを作成（認証ヘッダーなし）
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'PUT',
        body: JSON.stringify({
          content: '更新されたコメント内容',
        }),
      }
    )

    // APIを実行
    const response = await PUT(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})

describe('DELETE /api/comments/:id', () => {
  const ownerToken = generateToken({
    userId: 10,
    email: 'manager@test.com',
    role: 'manager',
  })

  const otherUserToken = generateToken({
    userId: 20,
    email: 'other@test.com',
    role: 'manager',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('本人が自分のコメントを削除できる', async () => {
    // モックデータ
    const mockExistingComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: 'テストコメント',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
    }

    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockExistingComment)
    vi.mocked(prisma.comment.delete).mockResolvedValue(mockExistingComment)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      }
    )

    // APIを実行
    const response = await DELETE(request)

    // アサーション
    expect(response.status).toBe(204)
    expect(response.body).toBeNull()

    // Prismaが正しく呼ばれたことを確認
    expect(prisma.comment.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    })
    expect(prisma.comment.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    })
  })

  it('他人のコメントは削除できない（403エラー）', async () => {
    const mockExistingComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: 'テストコメント',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
    }

    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockExistingComment)

    // リクエストを作成（別ユーザーのトークン）
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
        },
      }
    )

    // APIを実行
    const response = await DELETE(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
    expect(data.error.message).toBe('他人のコメントは削除できません')

    // deleteが呼ばれていないことを確認
    expect(prisma.comment.delete).not.toHaveBeenCalled()
  })

  it('存在しないコメントは削除できない（404エラー）', async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/comments/999',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      }
    )

    // APIを実行
    const response = await DELETE(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('コメントが見つかりません')
  })

  it('認証トークンなしではアクセスできない（401エラー）', async () => {
    // リクエストを作成（認証ヘッダーなし）
    const request = new NextRequest(
      'http://localhost:3000/api/comments/1',
      {
        method: 'DELETE',
      }
    )

    // APIを実行
    const response = await DELETE(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})
