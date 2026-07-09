import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// DB-backed sessions with hybrid auth.
//
// The token is stored on the User row (sessionToken, unique-indexed).
// The client sends it as an `Authorization: Bearer` header on every
// request, which works in ALL contexts — including cross-origin iframes
// like the preview panel, where sameSite cookies are silently dropped.
// We also accept `x-session-token` (legacy) and a cookie (same-origin
// fallback) for maximum compatibility.

const SESSION_COOKIE = "swapshelf_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Production-ready password hashing with bcrypt
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
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

/**
 * Resolve the session token from any supported transport vector:
 *   1. Authorization: Bearer <token>  (standard, works in iframes)
 *   2. x-session-token header         (legacy compat)
 *   3. swapshelf_session cookie        (same-origin fallback)
 */
export async function resolveSessionToken(): Promise<string | null> {
  const h = await headers();

  // 1) Authorization: Bearer <token>
  const authHeader = h.get("authorization");
  if (authHeader && /^bearer\s+/i.test(authHeader)) {
    const t = authHeader.replace(/^bearer\s+/i, "").trim();
    if (t) return t;
  }

  // 2) x-session-token header
  const xToken = h.get("x-session-token");
  if (xToken) return xToken;

  // 3) Cookie fallback
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;

  return null;
}

export async function destroySession(): Promise<void> {
  const token = await resolveSessionToken();
  if (token) {
    await db.user
      .updateMany({
        where: { sessionToken: token },
        data: { sessionToken: null },
      })
      .catch(() => undefined);
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = await resolveSessionToken();
  if (!token) return null;
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
  if (user.frozen) {
    throw new Error("ACCOUNT_FROZEN");
  }
  return user;
}

/**
 * Require a moderator or admin. Frozen users are blocked even if
 * they somehow have a mod role (defense in depth).
 */
export async function requireModerator() {
  const user = await requireUser();
  if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Require an admin. Used for the most destructive actions (banning
 * users, force-closing loans).
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
