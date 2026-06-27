import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/auth";
import { withErrorHandler } from "@/lib/serialize";

// GET /api/admin/messages/[loanId]
//
// Privileged message fetcher for moderators. Bypasses the standard
// party-membership check — admins/mods can read ANY loan's full chat
// history without being a participant. Used by the Moderation Dashboard
// when a moderator clicks into a dispute for the full context.
//
// The route includes the sender relation so the moderator can see who
// sent each message (by name + avatar), which the inline disputes
// fetch doesn't provide.
export const GET = withErrorHandler(
  async (
    _req: Request,
    ctx: { params: Promise<{ loanId: string }> }
  ) => {
    await requireModerator();
    const { loanId } = await ctx.params;

    const messages = await db.message.findMany({
      where: { loanId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        loanId: m.loanId,
        senderId: m.senderId,
        senderName: m.sender?.name || "System",
        senderAvatarUrl: m.sender?.avatarUrl || null,
        text: m.text,
        systemEvent: m.systemEvent,
        isSystem: !!m.systemEvent,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  }
);
