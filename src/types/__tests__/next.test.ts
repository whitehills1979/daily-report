import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { isAuthenticatedRequest } from '../next'
import type { JWTPayload } from '../auth'

describe('isAuthenticatedRequest', () => {
  it('should return true when request has user property', () => {
    const request = new NextRequest('http://localhost/api/test')

    const user: JWTPayload = {
      userId: 1,
      email: 'test@example.com',
      role: 'sales',
    }

    // ユーザー情報をリクエストに追加
    Object.defineProperty(request, 'user', {
      value: user,
      writable: false,
      enumerable: true,
    })

    expect(isAuthenticatedRequest(request)).toBe(true)
  })

  it('should return false when request does not have user property', () => {
    const request = new NextRequest('http://localhost/api/test')

    expect(isAuthenticatedRequest(request)).toBe(false)
  })

  it('should return false when user property is undefined', () => {
    const request = new NextRequest('http://localhost/api/test')

    Object.defineProperty(request, 'user', {
      value: undefined,
      writable: false,
      enumerable: true,
    })

    expect(isAuthenticatedRequest(request)).toBe(false)
  })

  it('should narrow type correctly when used as type guard', () => {
    const request = new NextRequest('http://localhost/api/test')

    const user: JWTPayload = {
      userId: 1,
      email: 'test@example.com',
      role: 'manager',
    }

    Object.defineProperty(request, 'user', {
      value: user,
      writable: false,
      enumerable: true,
    })

    if (isAuthenticatedRequest(request)) {
      // TypeScriptの型が正しく推論されているかテスト
      expect(request.user).toBeDefined()
      expect(request.user.userId).toBe(1)
      expect(request.user.email).toBe('test@example.com')
      expect(request.user.role).toBe('manager')
    }
  })
})
