import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";

export const PATCH = withErrorHandler(async (req: Request) => {
  const me = await requireUser();

  let body: {
    latitude?: number;
    longitude?: number;
    zipCode?: string;
    neighborhood?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (
    typeof body.latitude !== "number" ||
    typeof body.longitude !== "number" ||
    Number.isNaN(body.latitude) ||
    Number.isNaN(body.longitude)
  ) {
    return NextResponse.json(
      { error: "latitude and longitude are required" },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id: me.id },
    data: {
      latitude: body.latitude,
      longitude: body.longitude,
      zipCode: body.zipCode ?? me.zipCode,
      neighborhood: body.neighborhood ?? me.neighborhood,
    },
  });

  return NextResponse.json(stripSelfUser(updated));
});
