import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

// Simple session store: session token -> userId, persisted in memory.
// In production this would be a DB-backed session table; for SwapShelf
// sandbox we keep it lightweight but cookie-based so SSR works.

interface Session {
  userId: string;
  createdAt: number;
}

const sessions = new Map<string, Session>();
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
  sessions.set(token, { userId, createdAt: Date.now() });
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
  if (token) sessions.delete(token);
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
