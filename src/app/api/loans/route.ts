import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";
import {
  serializeLoan,
  loanInclude,
  type LoanWithRelations,
} from "@/lib/loan-serialize";

// GET /api/loans — all loans where the current user is borrower or lender,
// sorted by updatedAt desc. Includes item, parties, meetup, lastMessage.
export const GET = withErrorHandler(async () => {
  const me = await requireUser();

  const loans = await db.loan.findMany({
    where: {
      OR: [{ borrowerId: me.id }, { lenderId: me.id }],
    },
    include: loanInclude,
    orderBy: { updatedAt: "desc" },
  });

  // Pull last message per loan in one round-trip.
  const loanIds = loans.map((l) => l.id);
  const lastMessages =
    loanIds.length > 0
      ? await db.message.findMany({
          where: { loanId: { in: loanIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const lastByLoan = new Map<string, (typeof lastMessages)[number]>();
  for (const m of lastMessages) {
    if (!lastByLoan.has(m.loanId)) lastByLoan.set(m.loanId, m);
  }

  return NextResponse.json(
    loans.map((l) =>
      serializeLoan({
        ...l,
        lastMessage: lastByLoan.get(l.id) ?? null,
      } as LoanWithRelations)
    )
  );
});

// POST /api/loans — request to borrow an item
// Body: { itemId, proposedReturnDate }
export const POST = withErrorHandler(async (req: Request) => {
  const me = await requireUser();

  let body: { itemId?: string; proposedReturnDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const itemId = body.itemId;
  const proposedReturnDateRaw = body.proposedReturnDate;

  if (!itemId) {
    return NextResponse.json(
      { error: "itemId is required" },
      { status: 400 }
    );
  }
  let proposedReturnDate: Date | null = null;
  if (proposedReturnDateRaw) {
    const d = new Date(proposedReturnDateRaw);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "proposedReturnDate is not a valid date" },
        { status: 400 }
      );
    }
    proposedReturnDate = d;
  }

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (item.ownerId === me.id) {
    return NextResponse.json(
      { error: "You can't borrow your own item" },
      { status: 400 }
    );
  }
  if (item.status !== "AVAILABLE") {
    return NextResponse.json(
      { error: "This item is not available to borrow" },
      { status: 400 }
    );
  }

  const loan = await db.loan.create({
    data: {
      itemId: item.id,
      borrowerId: me.id,
      lenderId: item.ownerId,
      status: "REQUESTED",
      proposedReturnDate,
    },
    include: loanInclude,
  });

  await db.item.update({
    where: { id: item.id },
    data: { status: "REQUESTED" },
  });

  return NextResponse.json(serializeLoan({ ...loan, lastMessage: null }));
});
