import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { generateToken } from '@/lib/auth'

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーがログアウトに成功する', async () => {
    // 有効なトークンを生成
    const token = generateToken({
      userId: 1,
      email: 'yamada@example.com',
      role: 'sales',
    })

    // リクエストを作成
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    // APIを実行
    const response = await POST(request)
    const data = await response.json()

    // アサーション
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toBe('ログアウトしました')
  })

  it('認証トークンがない場合に401エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe('認証が必要です')
  })

  it('無効なトークンで401エラーを返す', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe('トークンが無効です')
  })

  it('Bearerスキームがない場合に401エラーを返す', async () => {
    const token = generateToken({
      userId: 1,
      email: 'yamada@example.com',
      role: 'sales',
    })

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        authorization: token, // Bearer スキームなし
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
    expect(data.error.message).toBe('認証が必要です')
  })
})
