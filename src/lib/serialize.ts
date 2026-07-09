// Serialization helpers — strip sensitive fields before sending user objects
// over the API. We never expose passwordHash, and we only reveal a user's
// precise location to themselves.

import type { User } from "@prisma/client";
import { buildRequestLogger } from "@/lib/logger";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  neighborhood?: string | null;
  swapScore: number;
  createdAt: string;
}

export interface SelfUser extends PublicUser {
  latitude: number;
  longitude: number;
  zipCode?: string | null;
  sessionToken?: string | null;
  frozen?: boolean;
  role?: string;
}

/**
 * Safe public user object — no passwordHash, no lat/lon, no zipCode.
 */
export function stripUser(u: User | null | undefined): PublicUser | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    neighborhood: u.neighborhood,
    swapScore: u.swapScore,
    createdAt: u.createdAt.toISOString(),
  };
}

/**
 * The CURRENT user's own object. Still strips passwordHash but keeps latitude/longitude/zipCode.
 */
export function stripSelfUser(u: User | null | undefined): SelfUser | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    neighborhood: u.neighborhood,
    swapScore: u.swapScore,
    createdAt: u.createdAt.toISOString(),
    latitude: u.latitude,
    longitude: u.longitude,
    zipCode: u.zipCode,
    sessionToken: u.sessionToken,
    frozen: u.frozen,
    role: u.role,
  };
}

/**
 * Minimal owner shape for discover results.
 */
export function stripItemOwner(u: User | null | undefined) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    neighborhood: u.neighborhood,
    swapScore: u.swapScore,
    avatarUrl: u.avatarUrl,
  };
}

export function withErrorHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    const request = args[0];
    let path = "unknown";
    let method = "UNKNOWN";
    let requestId: string | undefined;

    if (request instanceof Request) {
      method = request.method;
      try {
        const url = new URL(request.url);
        path = url.pathname;
      } catch {
        path = "unknown";
      }
    }

    requestId = request instanceof Request
      ? request.headers.get("x-request-id") || undefined
      : undefined;

    const logger = buildRequestLogger({
      msg: path,
      method,
      path,
      requestId,
    });

    try {
      const response = await fn(...args);
      const status = response.status;
      logger.complete(status);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        message === "UNAUTHORIZED"
          ? 401
          : message === "ACCOUNT_FROZEN" || message === "FORBIDDEN"
          ? 403
          : 500;

      logger.complete(status);

      if (status === 401) {
        return Response.json({ error: "Please sign in" }, { status: 401 });
      }
      if (status === 403) {
        return Response.json(
          {
            error:
              message === "ACCOUNT_FROZEN"
                ? "Your account has been suspended due to a reported issue. Please contact support."
                : "You don't have permission to perform this action.",
          },
          { status: 403 }
        );
      }

      console.error("[api] unhandled error:", err);
      return Response.json(
        { error: message || "Internal server error" },
        { status: 500 }
      );
    }
  };
}
