"use client";

import { useState } from "react";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ItemCover } from "@/components/shared/item-cover";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SwapScoreBadge } from "@/components/shared/swap-score";
import { TypePill, ConditionBadge } from "@/components/shared/badges";
import { fuzzyDistance } from "@/lib/geo";
import { format, differenceInDays, addDays } from "date-fns";
import { Loader2, CalendarDays, MapPin, ArrowRight, Check } from "lucide-react";
import type { Item } from "@/lib/types";
import { toast } from "sonner";

export function RequestLoanDialog({
  item,
  onClose,
}: {
  item: Item | null;
  onClose: () => void;
}) {
  const { openLoan, refreshLoans } = useApp();
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 14));
  const [busy, setBusy] = useState(false);

  async function handleRequest() {
    if (!item || !date) return;
    setBusy(true);
    try {
      const loan = await api.requestLoan({
        itemId: item.id,
        proposedReturnDate: date.toISOString(),
      });
      toast.success("Request sent! We'll notify you when they respond.");
      await refreshLoans();
      onClose();
      openLoan(loan.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to request");
      setBusy(false);
    }
  }

  if (!item) return null;
  const days = date ? differenceInDays(date, new Date()) : 0;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border bg-secondary/30 px-6 py-4">
          <DialogTitle className="font-display text-xl">Request to borrow</DialogTitle>
          <DialogDescription>
            Propose a return date — the lender will respond in your shared chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* Item preview */}
          <div className="flex gap-4 rounded-xl border border-border bg-card p-3">
            <ItemCover
              title={item.title}
              creator={item.creator}
              type={item.type}
              imageUrl={item.imageUrl}
              className="aspect-[2/3] w-16 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex gap-1.5">
                <TypePill type={item.type} />
                <ConditionBadge condition={item.condition} />
              </div>
              <p className="font-display font-semibold leading-tight text-foreground">
                {item.title}
              </p>
              {item.creator && (
                <p className="text-xs text-muted-foreground">{item.creator}</p>
              )}
              {item.owner && (
                <div className="mt-2 flex items-center gap-2">
                  <UserAvatar
                    name={item.owner.name}
                    avatarUrl={item.owner.avatarUrl}
                    size="xs"
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.owner.name}
                  </span>
                  <SwapScoreBadge score={item.owner.swapScore ?? 50} />
                </div>
              )}
            </div>
          </div>

          {/* Location note */}
          {typeof item.distanceMiles === "number" && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/8 px-3 py-2 text-xs text-accent">
              <MapPin className="size-3.5" />
              Lender is {fuzzyDistance(item.distanceMiles)}. Exact address is
              private — you'll agree on a safe meetup spot in chat.
            </div>
          )}

          {/* Date picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CalendarDays className="size-4 text-primary" />
                Proposed return date
              </label>
              {date && (
                <span className="text-xs text-muted-foreground">
                  {days} day{days === 1 ? "" : "s"} from now
                </span>
              )}
            </div>
            <div className="flex justify-center rounded-xl border border-border bg-card p-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < addDays(new Date(), 1) || d > addDays(new Date(), 90)}
                initialFocus
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {date
                ? `Return by ${format(date, "EEEE, MMM d, yyyy")}`
                : "Pick a date"}
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-secondary/20 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleRequest}
            disabled={busy || !date}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Send request
            <ArrowRight className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
