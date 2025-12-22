import type { PasswordValidationResult } from '@/types/auth'

/**
 * パスワードの強度を検証する
 * @param password - 検証するパスワード
 * @returns 検証結果
 */
export function validatePasswordStrength(
  password: string,
): PasswordValidationResult {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'パスワードは8文字以上である必要があります',
    }
  }

  const hasNumber = /\d/.test(password)
  const hasLetter = /[a-zA-Z]/.test(password)

  if (!hasNumber || !hasLetter) {
    return {
      valid: false,
      message: 'パスワードは英数字を含む必要があります',
    }
  }

  return { valid: true }
}
