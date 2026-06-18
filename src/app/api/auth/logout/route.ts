import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

export const POST = withErrorHandler(async () => {
  await destroySession();
  return new NextResponse(null, { status: 204 });
});
