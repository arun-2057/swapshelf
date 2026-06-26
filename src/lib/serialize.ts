// Serialization helpers — strip sensitive fields before sending user objects
// over the API. We never expose passwordHash, and we only reveal a user's
// precise location to themselves.

import type { User } from "@prisma/client";

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
}

/**
 * Safe public user object — no passwordHash, no lat/lon, no zipCode.
 * Use this when returning OTHER users (item owners, loan counterparties,
 * reviewers, profile views).
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
 * The CURRENT user's own object. Still strips passwordHash but keeps
 * latitude/longitude/zipCode so the client can render the onboarding map
 * and discover radius correctly.
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
  };
}

/**
 * Minimal owner shape for discover results. Only the fields the UI needs
 * to render a card without leaking another member's exact address.
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

/**
 * Wrap an async route handler so any "UNAUTHORIZED" error thrown by
 * requireUser() becomes a clean 401 response. Other errors return 500.
 */
export function withErrorHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "UNAUTHORIZED") {
        return Response.json({ error: "Please sign in" }, { status: 401 });
      }
      if (message === "ACCOUNT_FROZEN") {
        return Response.json(
          {
            error:
              "Your account has been suspended due to a reported issue. Please contact support.",
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
