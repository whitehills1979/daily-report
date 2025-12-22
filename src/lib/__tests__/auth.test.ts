import { describe, it, expect, beforeAll } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} from '../auth'

describe('Auth Library', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123'
      const hashed = await hashPassword(password)

      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
      expect(hashed.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123'
      const hashed1 = await hashPassword(password)
      const hashed2 = await hashPassword(password)

      expect(hashed1).not.toBe(hashed2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword(password, hashed)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword456'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hashed)

      expect(isValid).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'sales' as const,
      }
      const token = generateToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include payload data in token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'sales' as const,
      }
      const token = generateToken(payload)
      const decoded = verifyToken(token)

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
      expect(decoded.role).toBe(payload.role)
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'sales' as const,
      }
      const token = generateToken(payload)
      const decoded = verifyToken(token)

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
      expect(decoded.role).toBe(payload.role)
    })

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here'

      expect(() => verifyToken(invalidToken)).toThrow()
    })

    it('should verify manager role', () => {
      const payload = {
        userId: 2,
        email: 'manager@example.com',
        role: 'manager' as const,
      }
      const token = generateToken(payload)
      const decoded = verifyToken(token)

      expect(decoded.role).toBe('manager')
    })
  })
})
