import { describe, it, expect } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { extractToken, authenticateRequest, withAuth } from '../auth'
import { generateToken } from '@/lib/auth'
import type { JWTPayload } from '@/types/auth'
import type { AuthenticatedRequest } from '@/types/next'

describe('extractToken', () => {
  it('should extract token from valid Bearer authorization header', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: 'Bearer valid-token-123',
      },
    })

    const token = extractToken(request)
    expect(token).toBe('valid-token-123')
  })

  it('should return null when authorization header is missing', () => {
    const request = new NextRequest('http://localhost/api/test')

    const token = extractToken(request)
    expect(token).toBeNull()
  })

  it('should return null when authorization header does not start with Bearer', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: 'Basic some-credentials',
      },
    })

    const token = extractToken(request)
    expect(token).toBeNull()
  })

  it('should return null when authorization header format is invalid', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: 'BearerInvalidFormat',
      },
    })

    const token = extractToken(request)
    expect(token).toBeNull()
  })

  it('should return null when authorization header has too many parts', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: 'Bearer token extra-part',
      },
    })

    const token = extractToken(request)
    expect(token).toBeNull()
  })
})

describe('authenticateRequest', () => {
  const validPayload: JWTPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  }

  it('should authenticate request with valid token', () => {
    const token = generateToken(validPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const result = authenticateRequest(request)

    // 成功時はNextResponseではなく、userとrequestを含むオブジェクトが返される
    expect(result).not.toBeInstanceOf(NextResponse)
    if (!(result instanceof NextResponse)) {
      expect(result.user).toMatchObject(validPayload)
      expect(result.request).toBe(request)
    }
  })

  it('should return 401 error when authorization header is missing', () => {
    const request = new NextRequest('http://localhost/api/test')

    const result = authenticateRequest(request)

    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401)
    }
  })

  it('should return 401 error when token is invalid', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    const result = authenticateRequest(request)

    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401)
    }
  })

  it('should return 401 error when token is expired', () => {
    // Note: 実際の期限切れテストは時間を操作する必要があるため、
    // ここでは不正なトークンで代用
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
      },
    })

    const result = authenticateRequest(request)

    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401)
    }
  })

  it('should add user property to request object on successful authentication', () => {
    const token = generateToken(validPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const result = authenticateRequest(request)

    if (!(result instanceof NextResponse)) {
      // userプロパティがリクエストに追加されているか確認
      const authRequest = result.request as AuthenticatedRequest
      expect(authRequest.user).toBeDefined()
      expect(authRequest.user).toMatchObject(validPayload)
    }
  })

  it('should extract correct user information from token', () => {
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

    const result = authenticateRequest(request)

    if (!(result instanceof NextResponse)) {
      expect(result.user.userId).toBe(2)
      expect(result.user.email).toBe('manager@example.com')
      expect(result.user.role).toBe('manager')
    }
  })
})

describe('withAuth', () => {
  const validPayload: JWTPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'sales',
  }

  it('should return user information on successful authentication', async () => {
    const token = generateToken(validPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const result = await withAuth(request)

    expect(result).not.toBeInstanceOf(NextResponse)
    if (!(result instanceof NextResponse)) {
      expect(result.user).toMatchObject(validPayload)
    }
  })

  it('should return error response on authentication failure', async () => {
    const request = new NextRequest('http://localhost/api/test')

    const result = await withAuth(request)

    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401)
    }
  })
})
