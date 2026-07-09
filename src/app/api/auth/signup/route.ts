import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";
import { rateLimit } from "@/lib/rate-limit";
import { buildRequestLogger } from "@/lib/logger";
import { signupSchema } from "@/lib/validation";

export const POST = withErrorHandler(async (req: Request) => {
  const logger = buildRequestLogger({
    msg: "auth.signup",
    method: "POST",
    path: "/api/auth/signup",
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

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message || "Invalid request body";
    logger.complete(400);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const identifier = ip || email || "unknown";

  const limited = rateLimit(`signup:${identifier}`);
  if (!limited.ok) {
    logger.complete(429);
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: limited.retryAfterMs ? { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } : undefined }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    logger.complete(409);
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      latitude: 0,
      longitude: 0,
      swapScore: 50,
    },
  });

  await createSession(user.id);
  const withToken = await db.user.findUnique({ where: { id: user.id } });
  logger.complete(200);
  return NextResponse.json(stripSelfUser(withToken));
});
