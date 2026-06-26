import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { haversineMiles } from "@/lib/geo";
import { stripItemOwner, withErrorHandler } from "@/lib/serialize";
import type { ItemType, ItemCondition } from "@/lib/types";

// GET /api/items/discover?type=&condition=&availability=&radius=&q=
// Returns items within `radius` miles of the current user. Excludes items
// owned by the current user and items with status REMOVED. Each item
// carries a `distanceMiles` field (rounded to 2 decimals), sorted nearest first.
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

  const where: {
    ownerId: { not: string };
    status?: { in: string[] };
    type?: string;
    condition?: string;
    AND?: { OR: { title: { contains: string }; creator?: { contains: string } }[] }[];
  } = {
    ownerId: { not: me.id },
  };

  if (availability === "available") {
    where.status = { in: ["AVAILABLE"] };
  } else {
    // "all" — include everything except REMOVED and STOLEN
    where.status = {
      in: ["AVAILABLE", "REQUESTED", "IN_TRANSIT", "BORROWED", "RETURNED"],
    };
  }

  // Always exclude STOLEN items and flagged items from discovery —
  // they're under dispute or permanently removed from circulation.
  where.AND = [
    ...(where.AND || []),
    { flagged: false },
  ] as typeof where.AND;

  if (type && type !== "ALL") {
    where.type = type;
  }
  if (condition && condition !== "ALL") {
    where.condition = condition;
  }

  if (q) {
    // SQLite is case-insensitive for ASCII by default with LIKE; we use contains
    // which Prisma translates to LIKE. Wrap in OR for title/creator.
    where.AND = [
      {
        OR: [{ title: { contains: q } }, { creator: { contains: q } }],
      },
    ];
  }

  const items = await db.item.findMany({
    where,
    include: { owner: true },
  });

  // Compute distance from the current user to each item's owner.
  const enriched = items
    .map((i) => {
      const dist = haversineMiles(
        me.latitude,
        me.longitude,
        i.owner.latitude,
        i.owner.longitude
      );
      return {
        id: i.id,
        ownerId: i.ownerId,
        type: i.type,
        title: i.title,
        creator: i.creator,
        isbn: i.isbn,
        imageUrl: i.imageUrl,
        condition: i.condition,
        description: i.description,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        owner: stripItemOwner(i.owner),
        distanceMiles: Math.round(dist * 100) / 100,
      };
    })
    .filter((i) => i.distanceMiles <= radius)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  return NextResponse.json(enriched);
});
