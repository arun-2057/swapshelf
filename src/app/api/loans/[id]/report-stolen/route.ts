import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";
import {
  serializeLoan,
  loanInclude,
} from "@/lib/loan-serialize";

// POST /api/loans/[id]/report-stolen
// Body: { notes?: string }
//
// The lender marks an item as stolen/lost when a borrower has
// completely disappeared. This is the terminal "abandoned item"
// resolution — it:
//   - Sets the loan status to STOLEN (terminal, no further transitions)
//   - Sets the item status to STOLEN (removed from discovery)
//   - Freezes the borrower's account (prevents new borrows/lends)
//   - Posts a system message to the chat timeline
//
// Only the lender can trigger this, and only for loans that are
// actively BORROWED, OVERDUE, or DISPUTED (i.e. the item is still
// out and the borrower has ghosted). Everything runs in a single
// db.$transaction.
export const POST = withErrorHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    let body: { notes?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const loan = await db.loan.findUnique({
      where: { id },
      include: loanInclude,
    });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // Only the lender can report an item stolen.
    if (loan.lenderId !== me.id) {
      return NextResponse.json(
        { error: "Only the lender can report an item as stolen or lost" },
        { status: 403 }
      );
    }

    // The loan must be in an active state where the item is still out.
    const validStates = ["BORROWED", "OVERDUE", "DISPUTED", "DUE_SOON"];
    if (!validStates.includes(loan.status)) {
      return NextResponse.json(
        {
          error: `Item can only be reported stolen when actively borrowed (currently ${loan.status})`,
        },
        { status: 400 }
      );
    }

    const notes = body.notes?.trim() || null;

    const refreshed = await db.$transaction(async (tx) => {
      // 1. Loan → STOLEN (terminal)
      await tx.loan.update({
        where: { id: loan.id },
        data: { status: "STOLEN" },
      });

      // 2. Item → STOLEN (removed from discovery)
      await tx.item.update({
        where: { id: loan.itemId },
        data: { status: "STOLEN", flagged: true },
      });

      // 3. Freeze the borrower's account
      await tx.user.update({
        where: { id: loan.borrowerId },
        data: { frozen: true },
      });

      // 4. Timeline system message
      const noteText = notes ? ` Notes: ${notes}` : "";
      await tx.message.create({
        data: {
          loanId: loan.id,
          senderId: me.id,
          text: `Item reported as stolen/lost. The loan is permanently closed and the borrower's account has been suspended.${noteText}`,
          systemEvent: "loan:stolen_reported",
        },
      });

      return tx.loan.findUnique({
        where: { id: loan.id },
        include: loanInclude,
      });
    });

    return NextResponse.json(
      serializeLoan({ ...refreshed!, lastMessage: null })
    );
  }
);
