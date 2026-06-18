import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

// GET /api/loans/[id]/messages — oldest first
export const GET = withErrorHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    const loan = await db.loan.findUnique({ where: { id } });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    if (loan.borrowerId !== me.id && loan.lenderId !== me.id) {
      return NextResponse.json(
        { error: "You are not a participant in this loan" },
        { status: 403 }
      );
    }

    const messages = await db.message.findMany({
      where: { loanId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        loanId: m.loanId,
        senderId: m.senderId,
        text: m.text,
        systemEvent: m.systemEvent,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  }
);
