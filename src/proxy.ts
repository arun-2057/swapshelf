import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
];

const STATIC_ASSET_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
  ".css",
  ".js",
  ".map",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".json",
  ".txt",
  ".xml",
];

const CHAT_SERVICE_ORIGIN = process.env.CHAT_SERVICE_ORIGIN || "";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/health") {
    return NextResponse.json({ ok: true });
  }

  const response = NextResponse.next();

  const origin = request.headers.get("origin") || "";
  const isAllowedOrigin =
    ALLOWED_ORIGINS.includes(origin) ||
    origin === CHAT_SERVICE_ORIGIN ||
    (!origin && pathname.startsWith("/api"));

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, x-session-token, X-Session-Token",
        "Access-Control-Max-Age": "86400",
        ...(isAllowedOrigin && origin
          ? { "Access-Control-Allow-Origin": origin }
          : {}),
      },
    });
  }

  if (isAllowedOrigin && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  if (pathname.startsWith("/api")) {
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, x-session-token, X-Session-Token"
    );
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  const isDev = process.env.NODE_ENV !== "production";
  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; connect-src 'self' http: https: ws: wss:; font-src 'self' data:;"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self';";

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (static JSON data files)
     * - _next/font (static font files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|_next/data|_next/font|favicon.ico).*)',
  ],
};
