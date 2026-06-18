import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";
import {
  serializeLoan,
  loanInclude,
} from "@/lib/loan-serialize";

// POST /api/loans/[id]/meetup — propose or update a meetup spot
// Body: { name, address?, latitude, longitude }
export const POST = withErrorHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    let body: {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const name = body.name?.trim();
    if (
      !name ||
      typeof body.latitude !== "number" ||
      typeof body.longitude !== "number"
    ) {
      return NextResponse.json(
        { error: "name, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const loan = await db.loan.findUnique({ where: { id } });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    if (loan.borrowerId !== me.id && loan.lenderId !== me.id) {
      return NextResponse.json(
        { error: "Only the borrower or lender can manage this meetup" },
        { status: 403 }
      );
    }

    const meetup = await db.meetupSpot.upsert({
      where: { loanId: loan.id },
      create: {
        loanId: loan.id,
        name,
        address: body.address?.trim() || null,
        latitude: body.latitude,
        longitude: body.longitude,
        suggestedBy: me.id,
        agreedBy: null,
        status: "proposed",
      },
      update: {
        name,
        address: body.address?.trim() || null,
        latitude: body.latitude,
        longitude: body.longitude,
        suggestedBy: me.id,
        agreedBy: null,
        status: "proposed",
      },
    });

    // Push the loan into MEETING_SCHEDULED so the UI shows the meetup step.
    if (loan.status === "REQUESTED" || loan.status === "ACCEPTED") {
      await db.loan.update({
        where: { id: loan.id },
        data: { status: "MEETING_SCHEDULED" },
      });
    }

    const refreshed = await db.loan.findUnique({
      where: { id: loan.id },
      include: loanInclude,
    });
    return NextResponse.json(
      serializeLoan({ ...refreshed!, lastMessage: null, meetup })
    );
  }
);

// PATCH /api/loans/[id]/meetup — agree to the currently-proposed meetup
// Body: { action: "agree" }
export const PATCH = withErrorHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const me = await requireUser();
    const { id } = await ctx.params;

    let body: { action?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (body.action !== "agree") {
      return NextResponse.json(
        { error: 'Unknown action. Supported: "agree".' },
        { status: 400 }
      );
    }

    const loan = await db.loan.findUnique({
      where: { id },
      include: { meetup: true },
    });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    if (loan.borrowerId !== me.id && loan.lenderId !== me.id) {
      return NextResponse.json(
        { error: "Only the borrower or lender can manage this meetup" },
        { status: 403 }
      );
    }
    if (!loan.meetup) {
      return NextResponse.json(
        { error: "No meetup has been proposed yet" },
        { status: 400 }
      );
    }

    await db.meetupSpot.update({
      where: { loanId: loan.id },
      data: { agreedBy: me.id, status: "agreed" },
    });

    const refreshed = await db.loan.findUnique({
      where: { id: loan.id },
      include: loanInclude,
    });
    return NextResponse.json(
      serializeLoan({ ...refreshed!, lastMessage: null })
    );
  }
);
