import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAuthMulti } from '../require-auth'
import { generateToken } from '@/lib/auth'
import type { JWTPayload } from '@/types/auth'

describe('requireAuth', () => {
  const validPayload: JWTPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  }

  it('should call handler with user info when authentication succeeds', async () => {
    const token = generateToken(validPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (req, user) => {
      return NextResponse.json({ success: true, userId: user.userId })
    })

    const wrappedHandler = requireAuth(handler)
    const response = await wrappedHandler(request)

    // ハンドラーが呼ばれたことを確認
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(request, expect.objectContaining(validPayload))

    // レスポンスの確認
    expect(response).toBeInstanceOf(NextResponse)
    const jsonData = await response.json()
    expect(jsonData.success).toBe(true)
    expect(jsonData.userId).toBe(1)
  })

  it('should return 401 error when token is missing', async () => {
    const request = new NextRequest('http://localhost/api/test')

    const handler = vi.fn(async (req, user) => {
      return NextResponse.json({ success: true })
    })

    const wrappedHandler = requireAuth(handler)
    const response = await wrappedHandler(request)

    // ハンドラーは呼ばれない
    expect(handler).not.toHaveBeenCalled()

    // 401エラーが返される
    expect(response.status).toBe(401)
    const jsonData = await response.json()
    expect(jsonData.success).toBe(false)
    expect(jsonData.error.code).toBe('UNAUTHORIZED')
  })

  it('should return 401 error when token is invalid', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    const handler = vi.fn(async (req, user) => {
      return NextResponse.json({ success: true })
    })

    const wrappedHandler = requireAuth(handler)
    const response = await wrappedHandler(request)

    // ハンドラーは呼ばれない
    expect(handler).not.toHaveBeenCalled()

    // 401エラーが返される
    expect(response.status).toBe(401)
  })

  it('should pass correct user information to handler', async () => {
    const managerPayload: JWTPayload = {
      userId: 2,
      email: 'manager@example.com',
      role: 'manager',
    }
    const token = generateToken(managerPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (req, user) => {
      return NextResponse.json({
        userId: user.userId,
        email: user.email,
        role: user.role,
      })
    })

    const wrappedHandler = requireAuth(handler)
    const response = await wrappedHandler(request)

    // 正しいユーザー情報が渡されたか確認
    expect(handler).toHaveBeenCalledWith(request, expect.objectContaining(managerPayload))

    const jsonData = await response.json()
    expect(jsonData.userId).toBe(2)
    expect(jsonData.email).toBe('manager@example.com')
    expect(jsonData.role).toBe('manager')
  })

  it('should allow handler to return synchronous response', async () => {
    const token = generateToken(validPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    // 同期的にNextResponseを返すハンドラー
    const handler = vi.fn((req, user) => {
      return NextResponse.json({ sync: true })
    })

    const wrappedHandler = requireAuth(handler)
    const response = await wrappedHandler(request)

    expect(handler).toHaveBeenCalled()
    const jsonData = await response.json()
    expect(jsonData.sync).toBe(true)
  })
})

describe('requireAuthMulti', () => {
  const validPayload: JWTPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  }

  it('should wrap GET handler with authentication', async () => {
    const token = generateToken(validPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const getHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ method: 'GET', userId: user.userId })
    })

    const { GET } = requireAuthMulti({ GET: getHandler })

    expect(GET).toBeDefined()
    const response = await GET!(request)

    expect(getHandler).toHaveBeenCalledWith(request, expect.objectContaining(validPayload))
    const jsonData = await response.json()
    expect(jsonData.method).toBe('GET')
    expect(jsonData.userId).toBe(1)
  })

  it('should wrap POST handler with authentication', async () => {
    const token = generateToken(validPayload)
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const postHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ method: 'POST', email: user.email })
    })

    const { POST } = requireAuthMulti({ POST: postHandler })

    expect(POST).toBeDefined()
    const response = await POST!(request)

    expect(postHandler).toHaveBeenCalledWith(request, expect.objectContaining(validPayload))
    const jsonData = await response.json()
    expect(jsonData.method).toBe('POST')
    expect(jsonData.email).toBe('test@example.com')
  })

  it('should wrap multiple handlers with authentication', async () => {
    const token = generateToken(validPayload)

    const getHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ method: 'GET' })
    })
    const postHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ method: 'POST' })
    })
    const deleteHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ method: 'DELETE' })
    })

    const { GET, POST, DELETE } = requireAuthMulti({
      GET: getHandler,
      POST: postHandler,
      DELETE: deleteHandler,
    })

    expect(GET).toBeDefined()
    expect(POST).toBeDefined()
    expect(DELETE).toBeDefined()

    // GET
    const getRequest = new NextRequest('http://localhost/api/test', {
      headers: { authorization: `Bearer ${token}` },
    })
    await GET!(getRequest)
    expect(getHandler).toHaveBeenCalled()

    // POST
    const postRequest = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })
    await POST!(postRequest)
    expect(postHandler).toHaveBeenCalled()

    // DELETE
    const deleteRequest = new NextRequest('http://localhost/api/test', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    })
    await DELETE!(deleteRequest)
    expect(deleteHandler).toHaveBeenCalled()
  })

  it('should only create handlers for provided methods', () => {
    const getHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ method: 'GET' })
    })

    const handlers = requireAuthMulti({ GET: getHandler })

    expect(handlers.GET).toBeDefined()
    expect(handlers.POST).toBeUndefined()
    expect(handlers.PUT).toBeUndefined()
    expect(handlers.PATCH).toBeUndefined()
    expect(handlers.DELETE).toBeUndefined()
  })

  it('should return 401 for all methods when token is missing', async () => {
    const request = new NextRequest('http://localhost/api/test')

    const getHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ success: true })
    })
    const postHandler = vi.fn(async (req, user) => {
      return NextResponse.json({ success: true })
    })

    const { GET, POST } = requireAuthMulti({
      GET: getHandler,
      POST: postHandler,
    })

    const getResponse = await GET!(request)
    expect(getResponse.status).toBe(401)
    expect(getHandler).not.toHaveBeenCalled()

    const postResponse = await POST!(request)
    expect(postResponse.status).toBe(401)
    expect(postHandler).not.toHaveBeenCalled()
  })
})
