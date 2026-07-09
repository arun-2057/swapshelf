import type { PrismaTransaction } from "@/lib/db";

export interface SwapScoreMetrics {
  avgRating: number;
  reviewCount: number;
  completedSwaps: number;
  onTimeReturns: number;
  lateReturns: number;
  components: { review: number; volume: number; reliability: number; total: number };
}

export async function computeSwapScoreMetrics(userId: string, tx: PrismaTransaction): Promise<SwapScoreMetrics> {
  const reviews = await tx.review.findMany({ where: { revieweeId: userId, isRevealed: true }, select: { rating: true } });
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;
  const reviewComponent = reviewCount > 0 ? (avgRating / 5) * 50 : 0;

  const completedSwaps = await tx.loan.count({ where: { status: { in: ["RETURNED", "RESOLVED"] }, OR: [{ lenderId: userId }, { borrowerId: userId }] } });
  const volumeComponent = Math.min(completedSwaps * 3, 30);

  const returnedLoans = await tx.loan.findMany({ where: { borrowerId: userId, status: { in: ["RETURNED", "RESOLVED"] }, returnedDate: { not: null }, dueDate: { not: null } }, select: { dueDate: true, returnedDate: true } });
  let onTimeReturns = 0, lateReturns = 0;
  for (const loan of returnedLoans) {
    if (loan.returnedDate!.getTime() <= loan.dueDate!.getTime()) onTimeReturns++;
    else lateReturns++;
  }
  lateReturns += await tx.loan.count({ where: { borrowerId: userId, status: "OVERDUE" } });
  let reliabilityComponent = Math.max(0, Math.min(20, onTimeReturns * 2 - lateReturns * 3));

  const total = Math.max(0, Math.min(100, Math.round(reviewComponent + volumeComponent + reliabilityComponent)));
  return { avgRating, reviewCount, completedSwaps, onTimeReturns, lateReturns, components: { review: Math.round(reviewComponent*10)/10, volume: Math.round(volumeComponent*10)/10, reliability: Math.round(reliabilityComponent*10)/10, total } };
}

export async function computeGamifiedSwapScore(userId: string, tx: PrismaTransaction): Promise<number> {
  const metrics = await computeSwapScoreMetrics(userId, tx);
  await tx.user.update({ where: { id: userId }, data: { swapScore: metrics.components.total } });
  return metrics.components.total;
}

export const recomputeSwapScore = computeGamifiedSwapScore;
export const REVIEW_WINDOW_DAYS = 14;
