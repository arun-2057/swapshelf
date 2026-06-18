import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";

export const POST = withErrorHandler(async (req: Request) => {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  await createSession(user.id);
  // Re-fetch so the sessionToken is present on the returned object
  const withToken = await db.user.findUnique({ where: { id: user.id } });
  const safe = stripSelfUser(withToken);
  return NextResponse.json(safe);
});
