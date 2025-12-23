import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  requireRole,
  requireManager,
  requireSales,
  requireRoleMulti,
} from '../require-role'
import { generateToken } from '@/lib/auth'
import type { JWTPayload } from '@/types/auth'

describe('requireRole', () => {
  const salesPayload: JWTPayload = {
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  }

  const managerPayload: JWTPayload = {
    userId: 2,
    email: 'manager@example.com',
    role: 'manager',
  }

  it('should call handler when user has required role', async () => {
    const token = generateToken(managerPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ success: true, role: user.role })
    })

    const wrappedHandler = requireRole('manager', handler)
    const response = await wrappedHandler(request)

    expect(handler).toHaveBeenCalledWith(
      request,
      expect.objectContaining(managerPayload)
    )
    const jsonData = await response.json()
    expect(jsonData.success).toBe(true)
    expect(jsonData.role).toBe('manager')
  })

  it('should return 403 error when user does not have required role', async () => {
    const token = generateToken(salesPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ success: true })
    })

    const wrappedHandler = requireRole('manager', handler)
    const response = await wrappedHandler(request)

    // ハンドラーは呼ばれない
    expect(handler).not.toHaveBeenCalled()

    // 403エラーが返される
    expect(response.status).toBe(403)
    const jsonData = await response.json()
    expect(jsonData.success).toBe(false)
    expect(jsonData.error.code).toBe('FORBIDDEN')
    expect(jsonData.error.message).toContain('権限')
  })

  it('should return 401 error when token is missing', async () => {
    const request = new NextRequest('http://localhost/api/test')

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ success: true })
    })

    const wrappedHandler = requireRole('manager', handler)
    const response = await wrappedHandler(request)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
  })

  it('should accept array of allowed roles', async () => {
    const salesToken = generateToken(salesPayload)
    const managerToken = generateToken(managerPayload)

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ role: user.role })
    })

    const wrappedHandler = requireRole(['sales', 'manager'], handler)

    // Sales user
    const salesRequest = new NextRequest('http://localhost/api/test', {
      headers: { authorization: `Bearer ${salesToken}` },
    })
    const salesResponse = await wrappedHandler(salesRequest)
    expect(salesResponse.status).toBe(200)
    const salesData = await salesResponse.json()
    expect(salesData.role).toBe('sales')

    // Manager user
    const managerRequest = new NextRequest('http://localhost/api/test', {
      headers: { authorization: `Bearer ${managerToken}` },
    })
    const managerResponse = await wrappedHandler(managerRequest)
    expect(managerResponse.status).toBe(200)
    const managerData = await managerResponse.json()
    expect(managerData.role).toBe('manager')
  })

  it('should work with single role string', async () => {
    const token = generateToken(salesPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ success: true })
    })

    const wrappedHandler = requireRole('sales', handler)
    const response = await wrappedHandler(request)

    expect(handler).toHaveBeenCalled()
    expect(response.status).toBe(200)
  })
})

describe('requireManager', () => {
  const salesPayload: JWTPayload = {
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  }

  const managerPayload: JWTPayload = {
    userId: 2,
    email: 'manager@example.com',
    role: 'manager',
  }

  it('should allow manager to access protected route', async () => {
    const token = generateToken(managerPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ data: 'manager-only-data' })
    })

    const wrappedHandler = requireManager(handler)
    const response = await wrappedHandler(request)

    expect(handler).toHaveBeenCalled()
    expect(response.status).toBe(200)
    const jsonData = await response.json()
    expect(jsonData.data).toBe('manager-only-data')
  })

  it('should deny sales user from accessing manager-only route', async () => {
    const token = generateToken(salesPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ data: 'manager-only-data' })
    })

    const wrappedHandler = requireManager(handler)
    const response = await wrappedHandler(request)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })
})

describe('requireSales', () => {
  const salesPayload: JWTPayload = {
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  }

  const managerPayload: JWTPayload = {
    userId: 2,
    email: 'manager@example.com',
    role: 'manager',
  }

  it('should allow sales user to access protected route', async () => {
    const token = generateToken(salesPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ data: 'sales-data' })
    })

    const wrappedHandler = requireSales(handler)
    const response = await wrappedHandler(request)

    expect(handler).toHaveBeenCalled()
    expect(response.status).toBe(200)
    const jsonData = await response.json()
    expect(jsonData.data).toBe('sales-data')
  })

  it('should deny manager from accessing sales-only route', async () => {
    const token = generateToken(managerPayload)
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const handler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ data: 'sales-data' })
    })

    const wrappedHandler = requireSales(handler)
    const response = await wrappedHandler(request)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })
})

describe('requireRoleMulti', () => {
  const salesPayload: JWTPayload = {
    userId: 1,
    email: 'sales@example.com',
    role: 'sales',
  }

  const managerPayload: JWTPayload = {
    userId: 2,
    email: 'manager@example.com',
    role: 'manager',
  }

  it('should wrap multiple handlers with role-based access control', async () => {
    const managerToken = generateToken(managerPayload)

    const getHandler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ method: 'GET', role: user.role })
    })
    const deleteHandler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ method: 'DELETE', role: user.role })
    })

    const { GET, DELETE } = requireRoleMulti('manager', {
      GET: getHandler,
      DELETE: deleteHandler,
    })

    expect(GET).toBeDefined()
    expect(DELETE).toBeDefined()

    // GET request
    const getRequest = new NextRequest('http://localhost/api/test', {
      headers: { authorization: `Bearer ${managerToken}` },
    })
    const getResponse = await GET!(getRequest)
    expect(getHandler).toHaveBeenCalled()
    expect(getResponse.status).toBe(200)

    // DELETE request
    const deleteRequest = new NextRequest('http://localhost/api/test', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${managerToken}` },
    })
    const deleteResponse = await DELETE!(deleteRequest)
    expect(deleteHandler).toHaveBeenCalled()
    expect(deleteResponse.status).toBe(200)
  })

  it('should deny access when user does not have required role', async () => {
    const salesToken = generateToken(salesPayload)

    const getHandler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ success: true })
    })

    const { GET } = requireRoleMulti('manager', {
      GET: getHandler,
    })

    const request = new NextRequest('http://localhost/api/test', {
      headers: { authorization: `Bearer ${salesToken}` },
    })
    const response = await GET!(request)

    expect(getHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('should support multiple allowed roles', async () => {
    const salesToken = generateToken(salesPayload)
    const managerToken = generateToken(managerPayload)

    const postHandler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ role: user.role })
    })

    const { POST } = requireRoleMulti(['sales', 'manager'], {
      POST: postHandler,
    })

    // Sales user should have access
    const salesRequest = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { authorization: `Bearer ${salesToken}` },
    })
    const salesResponse = await POST!(salesRequest)
    expect(salesResponse.status).toBe(200)
    const salesData = await salesResponse.json()
    expect(salesData.role).toBe('sales')

    // Manager user should have access
    const managerRequest = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
    })
    const managerResponse = await POST!(managerRequest)
    expect(managerResponse.status).toBe(200)
    const managerData = await managerResponse.json()
    expect(managerData.role).toBe('manager')
  })

  it('should only create handlers for provided methods', () => {
    const getHandler = vi.fn(async (_req, _user) => {
      return NextResponse.json({ method: 'GET' })
    })

    const handlers = requireRoleMulti('manager', { GET: getHandler })

    expect(handlers.GET).toBeDefined()
    expect(handlers.POST).toBeUndefined()
    expect(handlers.PUT).toBeUndefined()
    expect(handlers.PATCH).toBeUndefined()
    expect(handlers.DELETE).toBeUndefined()
  })
})
