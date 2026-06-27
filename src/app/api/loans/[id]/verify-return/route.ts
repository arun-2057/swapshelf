import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";
import { serializeLoan, loanInclude } from "@/lib/loan-serialize";

// POST /api/loans/[id]/verify-return
// Body: { conditionRating, missingComponents[], notes?, evidenceImageUrl?, status }
//
// Lender signs off on the physical return. Single transaction:
//   PASSED → loan RESOLVED, item AVAILABLE
//   DISPUTED → loan DISPUTED, item DISPUTED+flagged, borrower NOT frozen
//              (dispute is reversible; stolen/lost is terminal)
//
// evidenceImageUrl supports data URLs (for sandbox) or CDN URLs (prod).
export const POST = withErrorHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    let body: {
      conditionRating?: string;
      missingComponents?: string[];
      notes?: string;
      evidenceImageUrl?: string;
      status?: string;
    };
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const conditionRating = body.conditionRating;
    const status = body.status;

    if (!conditionRating || !["EXCELLENT", "GOOD", "DAMAGED"].includes(conditionRating)) {
      return NextResponse.json({ error: "conditionRating must be EXCELLENT, GOOD, or DAMAGED" }, { status: 400 });
    }
    if (!status || !["PASSED", "DISPUTED"].includes(status)) {
      return NextResponse.json({ error: 'status must be "PASSED" or "DISPUTED"' }, { status: 400 });
    }

    const loan = await db.loan.findUnique({ where: { id }, include: loanInclude });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    if (loan.lenderId !== me.id) return NextResponse.json({ error: "Only the lender can verify the return" }, { status: 403 });
    if (loan.status !== "RETURNED") return NextResponse.json({ error: `Loan must be in RETURNED state (currently ${loan.status})` }, { status: 400 });
    if (loan.returnVerification) return NextResponse.json({ error: "This return has already been verified" }, { status: 400 });

    const missingComponents = Array.isArray(body.missingComponents) ? body.missingComponents : [];
    const notes = body.notes?.trim() || null;
    const evidenceImageUrl = body.evidenceImageUrl?.trim() || null;

    const refreshed = await db.$transaction(async (tx) => {
      await tx.returnVerification.create({
        data: {
          loanId: loan.id,
          verifiedById: me.id,
          conditionRating: conditionRating as "EXCELLENT" | "GOOD" | "DAMAGED",
          missingComponents: JSON.stringify(missingComponents),
          notes,
          evidenceImageUrl,
          status: status as "PASSED" | "DISPUTED",
        },
      });

      if (status === "PASSED") {
        await tx.loan.update({ where: { id: loan.id }, data: { status: "RESOLVED" } });
        await tx.item.update({ where: { id: loan.itemId }, data: { status: "AVAILABLE", flagged: false } });
        await tx.message.create({
          data: { loanId: loan.id, senderId: me.id, text: `Return verified — condition: ${conditionRating.toLowerCase()}. Swap complete!`, systemEvent: "loan:return_verified" },
        });
      } else {
        await tx.loan.update({ where: { id: loan.id }, data: { status: "DISPUTED" } });
        await tx.item.update({ where: { id: loan.itemId }, data: { status: "DISPUTED", flagged: true } });
        const detailParts = [`Condition: ${conditionRating.toLowerCase()}`];
        if (missingComponents.length > 0) detailParts.push(`Issues: ${missingComponents.join(", ")}`);
        if (notes) detailParts.push(`Notes: ${notes}`);
        if (evidenceImageUrl) detailParts.push("Photo evidence attached");
        await tx.message.create({
          data: { loanId: loan.id, senderId: me.id, text: `Return disputed — ${detailParts.join(" · ")}. SwapScore additions suspended pending resolution.`, systemEvent: "loan:return_disputed" },
        });
      }

      return tx.loan.findUnique({ where: { id: loan.id }, include: loanInclude });
    });

    return NextResponse.json(serializeLoan({ ...refreshed!, lastMessage: null }, me.id));
  }
);
