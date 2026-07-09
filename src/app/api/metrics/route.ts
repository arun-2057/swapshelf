import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [users, items, loans, messages, reviews, notifications] =
      await Promise.all([
        db.user.count(),
        db.item.count(),
        db.loan.count(),
        db.message.count(),
        db.review.count(),
        db.notification.count(),
      ]);

    const [availableItems, activeUsers, returnedLoans, disputedLoans] =
      await Promise.all([
        db.item.count({
          where: { status: "AVAILABLE", flagged: false },
        }),
        db.user.count({ where: { frozen: false } }),
        db.loan.count({ where: { status: "RETURNED" } }),
        db.loan.count({ where: { status: { in: ["DISPUTED", "STOLEN"] } } }),
      ]);

    return NextResponse.json({
      users,
      items,
      loans,
      messages,
      reviews,
      notifications,
      availableItems,
      activeUsers,
      returnedLoans,
      disputedLoans,
    });
  } catch {
    return NextResponse.json(
      { error: "metrics_unavailable" },
      { status: 503 }
    );
  }
}
