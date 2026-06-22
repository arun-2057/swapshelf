import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Type alias for a Prisma transaction client.
export type PrismaTransaction = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0]

// Enable SQLite Write-Ahead Logging (WAL) mode. This allows concurrent
// readers to coexist with a single writer, dramatically reducing
// SQLITE_BUSY errors during high-volume real-time chat messages paired
// with transactional status changes (meetup spots, loan transitions,
// reviews, etc.).
//
// WAL is safe to call repeatedly — it's a no-op if already enabled.
// In production with PostgreSQL, this pragma is ignored.
if (process.env.NODE_ENV !== 'production') {
  db.$executeRawUnsafe`PRAGMA journal_mode=WAL;`
    .then(() => {})
    .catch(() => {})
}
