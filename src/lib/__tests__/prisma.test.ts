import { describe, it, expect } from 'vitest'
import { prisma } from '../prisma'

describe('Prisma Client', () => {
  it('should be instantiated', () => {
    expect(prisma).toBeDefined()
  })

  it('should be a PrismaClient instance', () => {
    expect(prisma).toHaveProperty('$connect')
    expect(prisma).toHaveProperty('$disconnect')
  })

  it('should have user model', () => {
    expect(prisma).toHaveProperty('user')
  })

  it('should have customer model', () => {
    expect(prisma).toHaveProperty('customer')
  })

  it('should have dailyReport model', () => {
    expect(prisma).toHaveProperty('dailyReport')
  })

  it('should have visitRecord model', () => {
    expect(prisma).toHaveProperty('visitRecord')
  })

  it('should have comment model', () => {
    expect(prisma).toHaveProperty('comment')
  })
})
