import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({ log: ['error', 'warn'] })

prisma.$on('error', evento => {
  console.error('[prisma] erro:', evento.message)
})
