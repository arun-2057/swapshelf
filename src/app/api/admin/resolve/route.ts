import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";
import { computeGamifiedSwapScore } from "@/lib/swap-score";

// POST /api/admin/resolve
// Body: { loanId, action: "AWARD_LENDER" | "CLOSE_WITHOUT_PENALTY" | "BAN_USER" }
//
// Atomic escalation — every action runs inside a single transaction:
//   AWARD_LENDER: loan→RESOLVED, item→AVAILABLE, borrower SwapScore docked
//   CLOSE_WITHOUT_PENALTY: loan→RESOLVED, item→AVAILABLE, no SwapScore change
//   BAN_USER: loan→STOLEN, item→STOLEN, borrower frozen (admin only)
export const POST = withErrorHandler(async (req: Request) => {
  const admin = await requireAdmin();

  let body: { loanId?: string; action?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { loanId, action } = body;
  if (!loanId || !action) {
    return NextResponse.json({ error: "loanId and action are required" }, { status: 400 });
  }

  const validActions = ["AWARD_LENDER", "CLOSE_WITHOUT_PENALTY", "BAN_USER"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${validActions.join(", ")}` }, { status: 400 });
  }

  const loan = await db.loan.findUnique({
    where: { id: loanId },
    include: { item: true, returnVerification: true },
  });
  if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

  const result = await db.$transaction(async (tx) => {
    if (action === "BAN_USER") {
      // Freeze the borrower, mark loan as stolen
      await tx.user.update({ where: { id: loan.borrowerId }, data: { frozen: true } });
      await tx.loan.update({
        where: { id: loanId },
        data: { status: "STOLEN", resolvedAt: new Date(), moderatorId: admin.id },
      });
      await tx.item.update({
        where: { id: loan.itemId },
        data: { status: "STOLEN", flagged: true },
      });
      await tx.message.create({
        data: {
          loanId,
          senderId: admin.id,
          text: `Admin action: Borrower account suspended by moderator. Loan permanently closed.`,
          systemEvent: "moderation:ban_user",
        },
      });
    } else {
      // AWARD_LENDER or CLOSE_WITHOUT_PENALTY — both resolve the loan
      await tx.loan.update({
        where: { id: loanId },
        data: { status: "RESOLVED", resolvedAt: new Date(), moderatorId: admin.id },
      });
      await tx.item.update({
        where: { id: loan.itemId },
        data: { status: "AVAILABLE", flagged: false },
      });

      if (action === "AWARD_LENDER") {
        // Dock the borrower's SwapScore (recompute with the dispute counting against them)
        await computeGamifiedSwapScore(loan.borrowerId, tx);
        await tx.message.create({
          data: {
            loanId,
            senderId: admin.id,
            text: `Admin action: Dispute resolved in favor of the lender. Borrower SwapScore adjusted.`,
            systemEvent: "moderation:award_lender",
          },
        });
      } else {
        await tx.message.create({
          data: {
            loanId,
            senderId: admin.id,
            text: `Admin action: Dispute closed without penalty. No SwapScore changes applied.`,
            systemEvent: "moderation:close_no_penalty",
          },
        });
      }
    }

    return tx.loan.findUnique({ where: { id: loanId } });
  });

  return NextResponse.json({ success: true, loan: { id: result?.id, status: result?.status } });
});
