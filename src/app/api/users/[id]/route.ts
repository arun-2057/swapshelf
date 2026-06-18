import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler, stripUser } from "@/lib/serialize";

// GET /api/users/[id] — public profile + revealed reviews
export const GET = withErrorHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reviews = await db.review.findMany({
      where: { revieweeId: id, isRevealed: true },
      include: {
        reviewer: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const serializedReviews = reviews.map((r) => ({
      id: r.id,
      loanId: r.loanId,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      rating: r.rating,
      comment: r.comment,
      isRevealed: r.isRevealed,
      createdAt: r.createdAt.toISOString(),
      reviewer: r.reviewer
        ? { name: r.reviewer.name, avatarUrl: r.reviewer.avatarUrl }
        : null,
    }));

    return NextResponse.json({
      user: stripUser(user),
      reviews: serializedReviews,
    });
  }
);
