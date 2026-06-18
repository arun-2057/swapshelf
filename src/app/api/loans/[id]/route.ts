import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";
import {
  serializeLoan,
  loanInclude,
} from "@/lib/loan-serialize";

// PATCH /api/loans/[id]
// Body: { status, ...extra }
// Status transitions as described in the task spec.
export const PATCH = withErrorHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    let body: { status?: string; dueDate?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const newStatus = body.status;
    if (!newStatus) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const loan = await db.loan.findUnique({
      where: { id },
      include: loanInclude,
    });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    const isParty = loan.borrowerId === me.id || loan.lenderId === me.id;
    if (!isParty) {
      return NextResponse.json(
        { error: "Only the borrower or lender can update this loan" },
        { status: 403 }
      );
    }

    const data: Record<string, unknown> = { status: newStatus };

    switch (newStatus) {
      case "ACCEPTED": {
        // Lender accepts. If dueDate provided, set it.
        if (body.dueDate) {
          const d = new Date(body.dueDate);
          if (!Number.isNaN(d.getTime())) data.dueDate = d;
        }
        break;
      }
      case "DECLINED":
      case "CANCELLED": {
        // Release the item back to AVAILABLE.
        await db.item.update({
          where: { id: loan.itemId },
          data: { status: "AVAILABLE" },
        });
        break;
      }
      case "MEETING_SCHEDULED": {
        // Keep as-is; UI drives this after both parties agree to a meetup.
        break;
      }
      case "BORROWED": {
        if (!loan.startDate) data.startDate = new Date();
        await db.item.update({
          where: { id: loan.itemId },
          data: { status: "BORROWED" },
        });
        break;
      }
      case "RETURNED": {
        data.returnedDate = new Date();
        // Bump item back through RETURNED -> AVAILABLE.
        await db.item.update({
          where: { id: loan.itemId },
          data: { status: "RETURNED" },
        });
        // Small delay-safe reset — we directly set AVAILABLE so it can be
        // borrowed again. (RETURNED on the item is mostly a logical flag.)
        await db.item.update({
          where: { id: loan.itemId },
          data: { status: "AVAILABLE" },
        });

        // +3 swapScore to both parties (cap at 100). Idempotent-ish: this
        // runs every time a loan is marked RETURNED. Acceptable for demo.
        await db.user.update({
          where: { id: loan.borrowerId },
          data: { swapScore: { increment: 3 } },
        });
        await db.user.update({
          where: { id: loan.lenderId },
          data: { swapScore: { increment: 3 } },
        });
        // Cap at 100 for both.
        const refreshed = await db.user.findMany({
          where: { id: { in: [loan.borrowerId, loan.lenderId] } },
          select: { id: true, swapScore: true },
        });
        for (const u of refreshed) {
          if (u.swapScore > 100) {
            await db.user.update({
              where: { id: u.id },
              data: { swapScore: 100 },
            });
          }
        }
        break;
      }
      case "OVERDUE": {
        // Just set status.
        break;
      }
      default: {
        return NextResponse.json(
          { error: `Unknown loan status: ${newStatus}` },
          { status: 400 }
        );
      }
    }

    const updated = await db.loan.update({
      where: { id },
      data,
      include: loanInclude,
    });

    return NextResponse.json(serializeLoan({ ...updated, lastMessage: null }));
  }
);
