import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { haversineMiles, fuzzyDistance } from "@/lib/geo";
import { withErrorHandler } from "@/lib/serialize";
import type { ItemType, ItemCondition } from "@/lib/types";

// GET /api/items/discover?type=&condition=&availability=&radius=&q=
// Returns items within `radius` miles of the current user. Excludes items
// owned by the current user and flagged (disputed/stolen) items. Each item
// carries a privacy-preserving `distanceString` field (fuzzyDistance),
// never exact coordinates.
export const GET = withErrorHandler(async (req: Request) => {
  const me = await requireUser();
  const { searchParams } = new URL(req.url);

  const type = (searchParams.get("type") || "ALL") as ItemType | "ALL";
  const condition = (searchParams.get("condition") || "ALL") as
    | ItemCondition
    | "ALL";
  const availability = (searchParams.get("availability") || "available") as
    | "available"
    | "all";
  const radius = Number(searchParams.get("radius") || "5");
  const q = (searchParams.get("q") || "").trim();

  const where = {
    ownerId: { not: me.id },
    flagged: false,
    ...(availability === "available"
      ? { status: { in: ["AVAILABLE"] as const } }
      : { status: { in: ["AVAILABLE", "REQUESTED", "IN_TRANSIT", "BORROWED", "RETURNED"] as const } }),
    ...(type && type !== "ALL" ? { type } : {}),
    ...(condition && condition !== "ALL" ? { condition } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [{ title: { contains: q } }, { creator: { contains: q } }],
            },
          ],
        }
      : {}),
  };

  const items = await db.item.findMany({
    where: where as Parameters<typeof db.item.findMany>[0] extends { where: infer W } ? W : never,
    include: { owner: true },
  });

  // Server-side Haversine filtering and fuzzy distance mapping.
  // Exact coordinates are never sent to the client.
  const discoveredItems = items
    .map((i) => {
      const exactDistance = haversineMiles(
        me.latitude,
        me.longitude,
        i.owner.latitude,
        i.owner.longitude
      );
      return {
        id: i.id,
        title: i.title,
        type: i.type,
        condition: i.condition,
        ownerName: i.owner.name,
        ownerScore: i.owner.swapScore,
        distanceString: fuzzyDistance(exactDistance),
      };
    })
    .filter((i) => {
      const numeric =
        parseFloat(i.distanceString) || 0;
      return numeric <= radius || i.distanceString === "around the corner";
    })
    .sort((a, b) => {
      const distA = parseFloat(a.distanceString) || 0;
      const distB = parseFloat(b.distanceString) || 0;
      return distA - distB;
    });

  return NextResponse.json({ items: discoveredItems });
});
