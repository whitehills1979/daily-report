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
    },
    comment: {
      create: vi.fn(),
    },
  },
}))

describe('POST /api/reports/:id/comments', () => {
  const managerToken = generateToken({
    userId: 10,
    email: 'manager@test.com',
    role: 'manager',
  })

  const salesToken = generateToken({
    userId: 1,
    email: 'sales@test.com',
    role: 'sales',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('上長が日報にコメントを追加できる', async () => {
    // モックデータ
    const mockReport = {
      id: 1,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: 'テスト課題',
      plan: 'テスト予定',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockComment = {
      id: 1,
      dailyReportId: 1,
      userId: 10,
      commentType: 'problem' as const,
      content: 'キーマンを特定して直接アプローチを検討しましょう。',
      createdAt: new Date('2025-12-18T19:00:00Z'),
      updatedAt: new Date('2025-12-18T19:00:00Z'),
      user: {
        id: 10,
        name: '佐藤部長',
        role: 'manager' as const,
      },
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(mockReport)
    vi.mocked(prisma.comment.create).mockResolvedValue(mockComment)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/reports/1/comments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          comment_type: 'problem',
          content: 'キーマンを特定して直接アプローチを検討しましょう。',
        }),
      }
    )

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      id: 1,
      user: {
        id: 10,
        name: '佐藤部長',
        role: 'manager',
      },
      comment_type: 'problem',
      content: 'キーマンを特定して直接アプローチを検討しましょう。',
      created_at: '2025-12-18T19:00:00.000Z',
    })

    // Prismaが正しく呼ばれたことを確認
    expect(prisma.dailyReport.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    })
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        dailyReportId: 1,
        userId: 10,
        commentType: 'problem',
        content: 'キーマンを特定して直接アプローチを検討しましょう。',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })
  })

  it('営業ユーザーはコメントを追加できない（403エラー）', async () => {
    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/reports/1/comments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          comment_type: 'problem',
          content: 'テストコメント',
        }),
      }
    )

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
    expect(data.error.message).toBe('この操作を実行する権限がありません')
  })

  it('存在しない日報にはコメントを追加できない（404エラー）', async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/reports/999/comments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          comment_type: 'problem',
          content: 'テストコメント',
        }),
      }
    )

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('日報が見つかりません')
  })

  it('空のコメントは追加できない（バリデーションエラー）', async () => {
    const mockReport = {
      id: 1,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: 'テスト課題',
      plan: 'テスト予定',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(mockReport)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/reports/1/comments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          comment_type: 'problem',
          content: '',
        }),
      }
    )

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toBeDefined()
    expect(data.error.details[0].field).toBe('content')
    expect(data.error.details[0].message).toBe('コメントを入力してください')
  })

  it('500文字を超えるコメントは追加できない（バリデーションエラー）', async () => {
    const mockReport = {
      id: 1,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: 'テスト課題',
      plan: 'テスト予定',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(mockReport)

    const longContent = 'あ'.repeat(501)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/reports/1/comments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          comment_type: 'problem',
          content: longContent,
        }),
      }
    )

    // APIを実行
    const response = await POST(request)
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

  it('無効なcomment_typeは拒否される（バリデーションエラー）', async () => {
    const mockReport = {
      id: 1,
      userId: 1,
      reportDate: new Date('2025-12-18'),
      problem: 'テスト課題',
      plan: 'テスト予定',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(mockReport)

    // リクエストを作成
    const request = new NextRequest(
      'http://localhost:3000/api/reports/1/comments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          comment_type: 'invalid_type',
          content: 'テストコメント',
        }),
      }
    )

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toBeDefined()
    expect(data.error.details[0].field).toBe('comment_type')
  })

  it('認証トークンなしではアクセスできない（401エラー）', async () => {
    // リクエストを作成（認証ヘッダーなし）
    const request = new NextRequest(
      'http://localhost:3000/api/reports/1/comments',
      {
        method: 'POST',
        body: JSON.stringify({
          comment_type: 'problem',
          content: 'テストコメント',
        }),
      }
    )

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})
