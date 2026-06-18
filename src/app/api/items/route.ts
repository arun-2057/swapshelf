import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";
import type { ItemType, ItemCondition } from "@/lib/types";

// GET /api/items?scope=mine — current user's items, newest first
// POST /api/items — create an item owned by the current user
export const GET = withErrorHandler(async (req: Request) => {
  const me = await requireUser();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (scope !== "mine") {
    return NextResponse.json(
      { error: "Unsupported scope. Use /api/items/discover for discovery." },
      { status: 400 }
    );
  }

  const items = await db.item.findMany({
    where: { ownerId: me.id },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      owner: stripSelfUser(i.owner),
    }))
  );
});

export const POST = withErrorHandler(async (req: Request) => {
  const me = await requireUser();

  let body: {
    title?: string;
    type?: ItemType;
    creator?: string;
    isbn?: string;
    imageUrl?: string;
    condition?: ItemCondition;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const title = body.title?.trim();
  const type = body.type;
  if (!title || !type || (type !== "BOOK" && type !== "BOARD_GAME")) {
    return NextResponse.json(
      { error: "title and type (BOOK or BOARD_GAME) are required" },
      { status: 400 }
    );
  }

  const validConditions: ItemCondition[] = [
    "NEW",
    "LIKE_NEW",
    "GOOD",
    "FAIR",
    "WORN",
  ];
  const condition = body.condition && validConditions.includes(body.condition)
    ? body.condition
    : "GOOD";

  const item = await db.item.create({
    data: {
      ownerId: me.id,
      title,
      type,
      creator: body.creator?.trim() || null,
      isbn: body.isbn?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      condition,
      description: body.description?.trim() || null,
      status: "AVAILABLE",
    },
    include: { owner: true },
  });

  return NextResponse.json({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    owner: stripSelfUser(item.owner),
  });
});
