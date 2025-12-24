import { describe, it, expect } from 'vitest'
import { validatePasswordStrength } from '../password'

describe('Password Validation', () => {
  describe('validatePasswordStrength', () => {
    it('should accept valid password with letters and numbers', () => {
      const result = validatePasswordStrength('password123')

      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should accept password with uppercase and lowercase', () => {
      const result = validatePasswordStrength('Password123')

      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('pass123')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('パスワードは8文字以上である必要があります')
    })

    it('should reject password with only letters', () => {
      const result = validatePasswordStrength('password')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('パスワードは英数字を含む必要があります')
    })

    it('should reject password with only numbers', () => {
      const result = validatePasswordStrength('12345678')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('パスワードは英数字を含む必要があります')
    })

    it('should accept password with exactly 8 characters', () => {
      const result = validatePasswordStrength('pass1234')

      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should accept long password', () => {
      const result = validatePasswordStrength(
        'thisIsAVeryLongPassword123456789',
      )

      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should accept password with special characters', () => {
      const result = validatePasswordStrength('password123!@#')

      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })
  })
})
