import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

// DB-backed sessions. We store a sessionToken directly on the User row
// and look it up via a unique index. This survives dev-server
// recompilations, module re-evaluations, and full server restarts —
// unlike an in-memory Map, which Next.js dev mode can wipe between
// requests when it recompiles route handlers.

const SESSION_COOKIE = "swapshelf_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Simple synchronous-ish hashing for demo (NOT for production passwords)
function hashPassword(password: string): string {
  // Lightweight hash — demo only. Do not reuse in production.
  let h = 0x811c9dc5;
  const salted = `swapshelf::${password}::v1`;
  for (let i = 0; i < salted.length; i++) {
    h ^= salted.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `h${(h >>> 0).toString(16)}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export { hashPassword };

export async function createSession(userId: string): Promise<string> {
  const token = randomUUID();
  // Persist the token on the user row so it survives server restarts
  // and dev-mode module re-evaluations.
  await db.user.update({
    where: { id: userId },
    data: { sessionToken: token },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    // Clear the token on the user row (if it still matches)
    await db.user
      .updateMany({
        where: { sessionToken: token },
        data: { sessionToken: null },
      })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Look the user up by their session token — a single indexed query.
  const user = await db.user.findUnique({
    where: { sessionToken: token },
  });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
