import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";

// DB-backed sessions with header-based auth.
//
// The token is stored on the User row (sessionToken, unique-indexed).
// The client sends it as an `x-session-token` header on every request,
// which works in ALL contexts — including cross-origin iframes like the
// preview panel, where sameSite cookies are silently dropped by browsers.
// We also set a cookie as a fallback for same-origin direct access.

const SESSION_COOKIE = "swapshelf_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Simple synchronous-ish hashing for demo (NOT for production passwords)
function hashPassword(password: string): string {
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
  await db.user.update({
    where: { id: userId },
    data: { sessionToken: token },
  });
  // Also set a cookie for same-origin fallback
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
  // Try to clear the token from the DB via header or cookie
  const h = await headers();
  const headerToken = h.get("x-session-token");
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value;
  const token = headerToken || cookieToken;
  if (token) {
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
  // 1) Header-based auth — works in cross-origin iframes / preview panels
  const h = await headers();
  const headerToken = h.get("x-session-token");
  if (headerToken) {
    const user = await db.user.findUnique({
      where: { sessionToken: headerToken },
    });
    if (user) return user;
  }

  // 2) Cookie fallback — works for same-origin direct browser access
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    const user = await db.user.findUnique({
      where: { sessionToken: cookieToken },
    });
    if (user) return user;
  }

  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
