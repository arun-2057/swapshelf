"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Shield, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { toast } from "sonner";
import type { Loan } from "@/lib/types";

export function ReviewDialog({
  loan,
  open,
  onOpenChange,
  counterpartyName,
}: {
  loan: Loan;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  counterpartyName: string;
}) {
  const { refreshLoans } = useApp();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await api.submitReview(loan.id, { rating, comment: comment.trim() || undefined });
      setRevealed(res.revealed);
      if (res.revealed) {
        toast.success("Both reviews are now revealed! SwapScores updated.");
      } else {
        toast.success("Review submitted. It'll be revealed once they review too.");
      }
      await refreshLoans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
      setBusy(false);
    }
  }

  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setRating(5);
      setHover(0);
      setComment("");
      setRevealed(false);
      setBusy(false);
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border bg-secondary/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Star className="size-5 fill-amber-400 text-amber-500" />
            Review your swap
          </DialogTitle>
          <DialogDescription>
            Rate {counterpartyName} for this exchange.
          </DialogDescription>
        </DialogHeader>

        {revealed ? (
          <div className="space-y-4 p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/12 text-primary">
              <Check className="size-7" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">
                Reviews revealed!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Both of you submitted reviews, so they're now visible on each
                other's profiles. SwapScores have been updated.
              </p>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            {/* Privacy note */}
            <div className="flex items-start gap-2 rounded-lg bg-primary/8 px-3 py-2 text-xs text-primary">
              <Shield className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong>Double-blind:</strong> your review stays sealed until{" "}
                {counterpartyName} submits theirs. No retaliation, just honesty.
              </span>
            </div>

            {/* Stars */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="transition hover:scale-110"
                    aria-label={`${n} stars`}
                  >
                    <Star
                      className={cn(
                        "size-9 transition",
                        (hover || rating) >= n
                          ? "fill-amber-400 text-amber-500"
                          : "fill-muted text-muted-foreground/40"
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {["", "Poor", "Fair", "Good", "Great", "Outstanding"][hover || rating]}
              </p>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Comment (optional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={"Friendly, specific, and kind. e.g. Picked up on time and returned in perfect shape."}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={busy}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <EyeOff className="size-4" />
                )}
                Submit sealed
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
