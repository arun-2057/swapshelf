import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/testimonial
// Public endpoint (no auth) — fetches a real revealed review with a
// high rating (4-5 stars) to feature on the landing page. Falls back
// to a curated default if no reviews exist yet.
export async function GET() {
  try {
    // Find the best revealed review (5 stars preferred, most recent)
    const review = await db.review.findFirst({
      where: {
        isRevealed: true,
        rating: { gte: 4 },
        comment: { not: null },
      },
      include: {
        reviewer: {
          select: { name: true, avatarUrl: true, neighborhood: true, swapScore: true },
        },
        loan: {
          include: {
            item: { select: { title: true } },
          },
        },
      },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    });

    if (!review) {
      // No real reviews yet — return null so the UI shows the fallback
      return NextResponse.json({ testimonial: null });
    }

    // Count the reviewer's completed swaps for the "X swaps" badge
    const reviewerSwaps = await db.loan.count({
      where: {
        OR: [{ borrowerId: review.reviewerId }, { lenderId: review.reviewerId }],
        status: { in: ["RETURNED", "RESOLVED"] },
      },
    });

    // Determine tier from swapScore
    const score = review.reviewer.swapScore ?? 50;
    const tier =
      score >= 90 ? "Caretaker" :
      score >= 70 ? "Trusted" :
      score >= 30 ? "Friendly" :
      "Newcomer";

    return NextResponse.json({
      testimonial: {
        quote: review.comment!,
        authorName: review.reviewer.name,
        authorInitial: review.reviewer.name.charAt(0).toUpperCase(),
        avatarUrl: review.reviewer.avatarUrl,
        neighborhood: review.reviewer.neighborhood || "SwapShelf",
        swaps: reviewerSwaps,
        tier,
        itemName: review.loan.item.title,
        rating: review.rating,
      },
    });
  } catch {
    return NextResponse.json({ testimonial: null });
  }
}
