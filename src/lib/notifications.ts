import { db } from "@/lib/db";
import type { PrismaTransaction } from "@/lib/db";

/**
 * Notification orchestrator — the single entry point for creating
 * notifications. Persists to the DB and prepares the socket payload.
 *
 * The actual socket emission happens client-side via the NotificationListener
 * in the app-shell, which receives notifications through the chat mini-service's
 * user-room broadcasts. This server-side helper only handles the DB write
 * so it can run inside transactions alongside the triggering state change.
 *
 * Usage inside a transaction:
 *   await sendNotification(tx, userId, "LOAN_REQUEST", "New request", "Diego wants to borrow Dune", loanId)
 *
 * Usage outside a transaction:
 *   await sendNotification(db, userId, "DISPUTE_RESOLVED", "Dispute resolved", "Your dispute has been resolved", loanId)
 */
export async function sendNotification(
  tx: PrismaTransaction | typeof db,
  userId: string,
  type: string,
  title: string,
  message: string,
  loanId?: string
) {
  const notification = await tx.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      loanId: loanId || null,
    },
  });

  // The socket emission is handled by the route handler after the
  // transaction commits — it calls emitNotification() with the
  // serialized notification. This prevents emitting for a transaction
  // that later rolls back.

  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    loanId: notification.loanId,
    createdAt: notification.createdAt.toISOString(),
  };
}

export interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  loanId: string | null;
  createdAt: string;
}
