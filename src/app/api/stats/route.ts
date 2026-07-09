import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/stats
// Public endpoint (no auth) — returns real platform metrics for the
// landing page. Computes from the DB so numbers are always live.
export async function GET() {
  try {
    const [totalItems, totalUsers, activeLoans, completedLoans] = await Promise.all([
      // Total items in circulation (not REMOVED or STOLEN)
      db.item.count({
        where: { status: { notIn: ["REMOVED", "STOLEN"] } },
      }),
      // Active shelves (users who aren't frozen)
      db.user.count({
        where: { frozen: false },
      }),
      // Active loans (currently borrowed or in transit)
      db.loan.count({
        where: { status: { in: ["BORROWED", "DUE_SOON", "OVERDUE", "DISPUTED", "ACCEPTED", "MEETING_SCHEDULED"] } },
      }),
      // Completed loans (returned or resolved)
      db.loan.count({
        where: { status: { in: ["RETURNED", "RESOLVED"] } },
      }),
    ]);

    // On-time returns: loans where returnedDate <= dueDate
    const returnedLoans = await db.loan.findMany({
      where: {
        status: { in: ["RETURNED", "RESOLVED"] },
        returnedDate: { not: null },
        dueDate: { not: null },
      },
      select: { dueDate: true, returnedDate: true },
    });

    const onTime = returnedLoans.filter(
      (l) => l.returnedDate!.getTime() <= l.dueDate!.getTime()
    ).length;
    const onTimePct = returnedLoans.length > 0
      ? Math.round((onTime / returnedLoans.length) * 100)
      : 100;

    // Average SwapScore across all users (proxy for community health)
    const avgScoreResult = await db.user.aggregate({
      _avg: { swapScore: true },
    });
    const avgSwapScore = Math.round(avgScoreResult._avg.swapScore || 0);

    return NextResponse.json({
      itemsCirculating: totalItems,
      activeShelves: totalUsers,
      activeLoans,
      completedSwaps: completedLoans,
      onTimeReturns: onTimePct,
      avgSwapScore,
    });
  } catch (error) {
    // Fallback to zeros if DB isn't ready (e.g., fresh install)
    return NextResponse.json({
      itemsCirculating: 0,
      activeShelves: 0,
      activeLoans: 0,
      completedSwaps: 0,
      onTimeReturns: 100,
      avgSwapScore: 50,
    });
  }
}
