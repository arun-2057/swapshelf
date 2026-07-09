import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

// POST /api/reviews
// Body: { loanId, rating (1-5), comment? }
// reviewerId = current user. revieweeId = the OTHER party.
// After insert, if both parties have reviewed this loan, reveal BOTH
// reviews and recompute the reviewee's swapScore.
export const POST = withErrorHandler(async (req: Request) => {
  const me = await requireUser();

  let body: { loanId?: string; rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const loanId = body.loanId;
  const rating = Number(body.rating);

  if (!loanId) {
    return NextResponse.json(
      { error: "loanId is required" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "rating must be an integer between 1 and 5" },
      { status: 400 }
    );
  }

  const loan = await db.loan.findUnique({ where: { id: loanId } });
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }
  if (loan.borrowerId !== me.id && loan.lenderId !== me.id) {
    return NextResponse.json(
      { error: "You are not a participant in this loan" },
      { status: 403 }
    );
  }

  const revieweeId =
    loan.borrowerId === me.id ? loan.lenderId : loan.borrowerId;

  // Already reviewed?
  const existing = await db.review.findUnique({
    where: { loanId_reviewerId: { loanId, reviewerId: me.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You have already reviewed this loan" },
      { status: 400 }
    );
  }

  await db.review.create({
    data: {
      loanId,
      reviewerId: me.id,
      revieweeId,
      rating,
      punctualityScore: rating,
      careScore: rating,
      comment: body.comment?.trim() || null,
      isRevealed: false,
    },
  });

  // Check if both parties have reviewed.
  const reviewsForLoan = await db.review.findMany({
    where: { loanId },
    select: { id: true, reviewerId: true, revieweeId: true },
  });

  const hasBorrowerReview = reviewsForLoan.some(
    (r) => r.reviewerId === loan.borrowerId
  );
  const hasLenderReview = reviewsForLoan.some(
    (r) => r.reviewerId === loan.lenderId
  );

  let revealed = false;
  if (hasBorrowerReview && hasLenderReview) {
    // Reveal both reviews.
    await db.review.updateMany({
      where: { loanId },
      data: { isRevealed: true },
    });
    revealed = true;

    // Recompute swapScore for the reviewee of THIS review (the counterparty).
    // The other review's reviewee is the current user — also recompute.
    const allRevealed = await db.review.findMany({
      where: { revieweeId, isRevealed: true },
      select: { rating: true },
    });
    const otherRevealed = await db.review.findMany({
      where: { revieweeId: me.id, isRevealed: true },
      select: { rating: true },
    });

    const recompute = async (userId: string, ratings: { rating: number }[]) => {
      if (ratings.length === 0) return;
      const avg =
        ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      const score = Math.max(
        0,
        Math.min(100, Math.round((avg / 5) * 70 + 30))
      );
      await db.user.update({ where: { id: userId }, data: { swapScore: score } });
    };

    await recompute(revieweeId, allRevealed);
    await recompute(me.id, otherRevealed);
  }

  return NextResponse.json({ revealed });
});
