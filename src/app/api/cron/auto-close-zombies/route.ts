import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/cron/auto-close-zombies?secret=<CRON_SECRET>
//
// Auto-closes "zombie" loans — loans that have been BORROWED or OVERDUE
// for more than 30 days with no activity (no messages, no status changes).
// These are the edge case where a borrower completely disappears with an
// item and the lender hasn't manually reported it stolen.
//
// For each zombie loan:
//   - Loan → STOLEN (terminal)
//   - Item → STOLEN + flagged (removed from discovery)
//   - Borrower → frozen (account suspended)
//   - System message posted to the chat timeline
//
// Everything runs in a single transaction per loan. Run daily in prod.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "dev";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Find zombie loans: BORROWED or OVERDUE, updated >30 days ago.
  const zombies = await db.loan.findMany({
    where: {
      status: { in: ["BORROWED", "OVERDUE"] },
      updatedAt: { lt: thirtyDaysAgo },
    },
    select: {
      id: true,
      itemId: true,
      borrowerId: true,
      lenderId: true,
    },
  });

  if (zombies.length === 0) {
    return NextResponse.json({ processed: 0, message: "No zombie loans." });
  }

  let processed = 0;

  for (const loan of zombies) {
    try {
      await db.$transaction(async (tx) => {
        await tx.loan.update({
          where: { id: loan.id },
          data: { status: "STOLEN" },
        });
        await tx.item.update({
          where: { id: loan.itemId },
          data: { status: "STOLEN", flagged: true },
        });
        await tx.user.update({
          where: { id: loan.borrowerId },
          data: { frozen: true },
        });
        await tx.message.create({
          data: {
            loanId: loan.id,
            senderId: loan.lenderId,
            text: "This loan has been automatically closed after 30 days of inactivity. The item is marked as stolen/lost and the borrower's account has been suspended.",
            systemEvent: "loan:auto_closed_zombie",
          },
        });
      });
      processed++;
    } catch (err) {
      console.error(`[auto-close-zombies] error on loan ${loan.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    runAt: now.toISOString(),
  });
}
