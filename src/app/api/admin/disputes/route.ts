import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

// GET /api/admin/disputes
// Returns all loans in DISPUTED or STOLEN status, with item + parties +
// return verification (including evidence photos). Mod/Admin only.
export const GET = withErrorHandler(async () => {
  const me = await requireModerator();

  const loans = await db.loan.findMany({
    where: {
      OR: [
        { status: "DISPUTED" },
        { status: "STOLEN" },
      ],
    },
    include: {
      item: { include: { owner: true } },
      borrower: { select: { id: true, name: true, email: true, swapScore: true, frozen: true, neighborhood: true } },
      lender: { select: { id: true, name: true, email: true, swapScore: true, frozen: true, neighborhood: true } },
      returnVerification: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = loans.map((loan) => ({
    id: loan.id,
    status: loan.status,
    title: loan.item.title,
    type: loan.item.type,
    imageUrl: loan.item.imageUrl,
    flagged: loan.item.flagged,
    borrower: loan.borrower,
    lender: loan.lender,
    dueDate: loan.dueDate?.toISOString() || null,
    resolvedAt: loan.resolvedAt?.toISOString() || null,
    moderatorId: loan.moderatorId,
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
    returnVerification: loan.returnVerification
      ? {
          id: loan.returnVerification.id,
          conditionRating: loan.returnVerification.conditionRating,
          missingComponents: (() => {
            try { return JSON.parse(loan.returnVerification.missingComponents || "[]"); } catch { return []; }
          })(),
          notes: loan.returnVerification.notes,
          evidenceImageUrl: loan.returnVerification.evidenceImageUrl,
          status: loan.returnVerification.status,
          createdAt: loan.returnVerification.createdAt.toISOString(),
        }
      : null,
    recentMessages: loan.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender?.name || "System",
      text: m.text,
      systemEvent: m.systemEvent,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return NextResponse.json({ disputes: serialized, moderator: { id: me.id, name: me.name, role: me.role } });
});
