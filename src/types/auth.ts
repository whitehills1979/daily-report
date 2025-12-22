export interface JWTPayload {
  userId: number
  email: string
  role: 'sales' | 'manager'
}

export interface PasswordValidationResult {
  valid: boolean
  message?: string
}
