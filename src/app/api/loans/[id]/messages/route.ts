import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

// GET /api/loans/[id]/messages — oldest first (DB is single source of truth)
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

// POST /api/loans/[id]/messages — persist a user message to the DB.
// The DB is the ledger; Socket.io is only the real-time event pipeline.
// After persisting, the client emits the canonical message over the
// socket so the counterparty receives it in real time.
export const POST = withErrorHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    let body: { text?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const text = (body.text || "").trim();
    if (!text) {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 }
      );
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Message is too long (4000 char max)" },
        { status: 400 }
      );
    }

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

    const saved = await db.message.create({
      data: {
        loanId: id,
        senderId: me.id,
        text,
        systemEvent: null,
      },
    });

    return NextResponse.json({
      id: saved.id,
      loanId: saved.loanId,
      senderId: saved.senderId,
      text: saved.text,
      systemEvent: saved.systemEvent,
      createdAt: saved.createdAt.toISOString(),
    });
  }
);
