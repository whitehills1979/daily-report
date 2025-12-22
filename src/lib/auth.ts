import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { JWTPayload } from '@/types/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'

/**
 * パスワードをハッシュ化する
 * @param password - プレーンテキストのパスワード
 * @returns ハッシュ化されたパスワード
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * パスワードを検証する
 * @param password - プレーンテキストのパスワード
 * @param hashedPassword - ハッシュ化されたパスワード
 * @returns パスワードが一致する場合はtrue
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * JWTトークンを生成する
 * @param payload - トークンに含めるペイロード
 * @returns JWTトークン
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

/**
 * JWTトークンを検証する
 * @param token - 検証するJWTトークン
 * @returns デコードされたペイロード
 * @throws トークンが無効な場合はエラー
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}
