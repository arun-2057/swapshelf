"use client";

import { cn } from "@/lib/utils";
import type {
  ItemStatus,
  LoanStatus,
  ItemCondition,
  ItemType,
} from "@/lib/types";

const itemStatusStyles: Record<ItemStatus, string> = {
  AVAILABLE: "bg-primary/12 text-primary border-primary/25",
  REQUESTED: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  IN_TRANSIT: "bg-accent/15 text-accent border-accent/30",
  BORROWED: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300",
  RETURNED: "bg-muted text-muted-foreground border-border",
  STOLEN: "bg-destructive/20 text-destructive border-destructive/50 line-through",
  REMOVED: "bg-muted text-muted-foreground border-border line-through",
};

const loanStatusStyles: Record<LoanStatus, string> = {
  REQUESTED: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  ACCEPTED: "bg-primary/12 text-primary border-primary/25",
  DECLINED: "bg-muted text-muted-foreground border-border",
  MEETING_SCHEDULED: "bg-accent/15 text-accent border-accent/30",
  BORROWED: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300",
  DUE_SOON: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  OVERDUE: "bg-destructive/15 text-destructive border-destructive/40",
  RETURNED: "bg-muted text-muted-foreground border-border",
  RESOLVED: "bg-muted text-muted-foreground border-border",
  STOLEN: "bg-destructive/25 text-destructive border-destructive/50 font-bold",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  DISPUTED: "bg-destructive/15 text-destructive border-destructive/40",
};

const loanStatusLabel: Record<LoanStatus, string> = {
  REQUESTED: "Requested",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  MEETING_SCHEDULED: "Meetup Set",
  BORROWED: "Borrowed",
  DUE_SOON: "Due Soon",
  OVERDUE: "Overdue",
  RETURNED: "Returned",
  RESOLVED: "Resolved",
  STOLEN: "Stolen/Lost",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

const itemStatusLabel: Record<ItemStatus, string> = {
  AVAILABLE: "Available",
  REQUESTED: "Requested",
  IN_TRANSIT: "In Transit",
  BORROWED: "Borrowed",
  RETURNED: "Returned",
  STOLEN: "Stolen/Lost",
  REMOVED: "Removed",
};

const conditionLabel: Record<ItemCondition, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  WORN: "Well-Loved",
};

export function ItemStatusBadge({
  status,
  className,
}: {
  status: ItemStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        itemStatusStyles[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {itemStatusLabel[status]}
    </span>
  );
}

export function LoanStatusBadge({
  status,
  className,
}: {
  status: LoanStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        loanStatusStyles[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {loanStatusLabel[status]}
    </span>
  );
}

export function ConditionBadge({
  condition,
  className,
}: {
  condition: ItemCondition;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground",
        className
      )}
    >
      {conditionLabel[condition]}
    </span>
  );
}

export function TypePill({
  type,
  className,
}: {
  type: ItemType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        type === "BOOK"
          ? "bg-primary/12 text-primary"
          : "bg-accent/15 text-accent",
        className
      )}
    >
      {type === "BOOK" ? "Book" : "Board Game"}
    </span>
  );
}
