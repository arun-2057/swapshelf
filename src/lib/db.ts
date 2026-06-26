import { PrismaClient, Prisma } from '@prisma/client'

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

// Enable SQLite pragmas for optimal concurrency and integrity.
// These are no-ops on PostgreSQL.
//
//   WAL             — Write-Ahead Logging: readers don't block writers
//                     and writers don't block readers. Essential for
//                     real-time chat + transactional loan updates.
//   busy_timeout    — If a write lock IS contended (rare under WAL),
//                     wait up to 5s before throwing SQLITE_BUSY instead
//                     of failing immediately. This absorbs transient
//                     contention from concurrent transactions.
//   foreign_keys    — Enforce referential integrity at the DB level
//                     (ON DELETE CASCADE, etc.). SQLite has this OFF
//                     by default for backwards compat; we want it ON.
if (process.env.NODE_ENV !== 'production') {
  const setup = async () => {
    try {
      await db.$executeRawUnsafe`PRAGMA journal_mode=WAL;`
      await db.$executeRawUnsafe`PRAGMA busy_timeout=5000;`
      await db.$executeRawUnsafe`PRAGMA foreign_keys=ON;`
    } catch {}
  }
  void setup()
}

/**
 * Transaction wrapper with automatic retry on SQLITE_BUSY.
 *
 * Under WAL mode, write contention is extremely rare, but if two
 * transactions hit the same page simultaneously, SQLite returns
 * SQLITE_BUSY. Instead of surfacing that as a 500 to the user, we
 * retry up to `maxRetries` times with exponential backoff.
 *
 * Usage (drop-in replacement for db.$transaction):
 *   const result = await withTransaction(async (tx) => { ... })
 */
export async function withTransaction<T>(
  fn: (tx: PrismaTransaction) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await db.$transaction(fn)
    } catch (error) {
      lastError = error
      // Prisma wraps SQLite errors; check for SQLITE_BUSY (code 5)
      // or the P2024 "Transaction write conflict" error.
      const isBusy =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2024' || error.code === 'P2034')
      if (!isBusy) throw error
      // Exponential backoff: 50ms, 100ms, 200ms
      await new Promise((r) => setTimeout(r, 50 * Math.pow(2, attempt)))
    }
  }
  throw lastError
}
