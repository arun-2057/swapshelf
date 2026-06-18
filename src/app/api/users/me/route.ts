import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";

export const PATCH = withErrorHandler(async (req: Request) => {
  const me = await requireUser();

  let body: { name?: string; bio?: string | null; avatarUrl?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.bio === "string") {
    data.bio = body.bio.trim() || null;
  }
  if (typeof body.avatarUrl === "string") {
    data.avatarUrl = body.avatarUrl.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  const updated = await db.user.update({ where: { id: me.id }, data });
  return NextResponse.json(stripSelfUser(updated));
});
