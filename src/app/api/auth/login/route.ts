import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";
import { rateLimit } from "@/lib/rate-limit";
import { buildRequestLogger } from "@/lib/logger";
import { loginSchema } from "@/lib/validation";

export const POST = withErrorHandler(async (req: Request) => {
  const logger = buildRequestLogger({
    msg: "auth.login",
    method: "POST",
    path: "/api/auth/login",
  });

  let ip = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) ip = realIp;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    logger.complete(400);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message || "Invalid request body";
    logger.complete(400);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const identifier = ip || email || "unknown";

  const limited = rateLimit(`login:${identifier}`);
  if (!limited.ok) {
    logger.complete(429);
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: limited.retryAfterMs ? { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } : undefined }
    );
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    logger.complete(401);
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  await createSession(user.id);
  const withToken = await db.user.findUnique({ where: { id: user.id } });
  logger.complete(200);
  return NextResponse.json(stripSelfUser(withToken));
});
