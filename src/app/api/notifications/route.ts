import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

// GET /api/notifications — list current user's notifications (unread first)
export const GET = withErrorHandler(async () => {
  const me = await requireUser();

  const notifications = await db.notification.findMany({
    where: { userId: me.id },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  const unreadCount = await db.notification.count({
    where: { userId: me.id, read: false },
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      loanId: n.loanId,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
});

// PATCH /api/notifications — mark all (or specific) as read
export const PATCH = withErrorHandler(async (req: Request) => {
  const me = await requireUser();

  let body: { id?: string };
  try { body = await req.json(); } catch { body = {}; }

  if (body.id) {
    // Mark specific notification as read
    await db.notification.updateMany({
      where: { id: body.id, userId: me.id },
      data: { read: true },
    });
  } else {
    // Mark all as read
    await db.notification.updateMany({
      where: { userId: me.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
});
