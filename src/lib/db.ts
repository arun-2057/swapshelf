import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Type alias for a Prisma transaction client.
export type PrismaTransaction = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0]

// Enable SQLite pragmas for optimal concurrency and integrity.
// These are required only on SQLite (local dev). On PostgreSQL (Vercel
// / Neon / Supabase) they are skipped — Postgres handles WAL, FKs, and
// locking at the engine level.
if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL?.startsWith('file:')) {
  const setup = async () => {
    try {
      await db.$executeRawUnsafe("PRAGMA journal_mode=WAL;")
      await db.$executeRawUnsafe("PRAGMA busy_timeout=5000;")
      await db.$executeRawUnsafe("PRAGMA foreign_keys=ON;")
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
