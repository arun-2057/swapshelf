import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { stripSelfUser, withErrorHandler } from "@/lib/serialize";
import type { ItemType, ItemCondition, ItemStatus } from "@/lib/types";

const VALID_TYPES: ItemType[] = ["BOOK", "BOARD_GAME"];
const VALID_CONDITIONS: ItemCondition[] = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "WORN",
];
const VALID_STATUSES: ItemStatus[] = [
  "AVAILABLE",
  "REQUESTED",
  "IN_TRANSIT",
  "BORROWED",
  "RETURNED",
  "REMOVED",
];

// PATCH /api/items/[id] — owner only
export const PATCH = withErrorHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    const item = await db.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.ownerId !== me.id) {
      return NextResponse.json(
        { error: "Only the owner can edit this item" },
        { status: 403 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) {
      data.title = body.title.trim();
    }
    if (typeof body.type === "string" && VALID_TYPES.includes(body.type as ItemType)) {
      data.type = body.type;
    }
    if (typeof body.creator === "string") {
      data.creator = body.creator.trim() || null;
    }
    if (typeof body.isbn === "string") {
      data.isbn = body.isbn.trim() || null;
    }
    if (typeof body.imageUrl === "string") {
      data.imageUrl = body.imageUrl.trim() || null;
    }
    if (
      typeof body.condition === "string" &&
      VALID_CONDITIONS.includes(body.condition as ItemCondition)
    ) {
      data.condition = body.condition;
    }
    if (typeof body.description === "string") {
      data.description = body.description.trim() || null;
    }
    if (
      typeof body.status === "string" &&
      VALID_STATUSES.includes(body.status as ItemStatus)
    ) {
      data.status = body.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const updated = await db.item.update({
      where: { id },
      data,
      include: { owner: true },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      owner: stripSelfUser(updated.owner),
    });
  }
);

// DELETE /api/items/[id] — soft delete (status -> REMOVED), owner only
export const DELETE = withErrorHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    const item = await db.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.ownerId !== me.id) {
      return NextResponse.json(
        { error: "Only the owner can delete this item" },
        { status: 403 }
      );
    }

    await db.item.update({ where: { id }, data: { status: "REMOVED" } });
    return new NextResponse(null, { status: 204 });
  }
);
