import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";

export const GET = withErrorHandler(async () => {
  const user = await getCurrentUser();
  return NextResponse.json(user ? stripSelfUser(user) : null, { status: 200 });
});
