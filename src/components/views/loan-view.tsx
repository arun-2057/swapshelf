"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { ItemCover } from "@/components/shared/item-cover";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SwapScoreBadge } from "@/components/shared/swap-score";
import { LoanStatusBadge, TypePill } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Send,
  MapPin,
  Check,
  X,
  Loader2,
  CheckCheck,
  CircleDot,
  Package,
  PackageCheck,
  HandHelping,
  Star,
  Shield,
  ShieldAlert,
  Wifi,
  WifiOff,
  CalendarDays,
  MessagesSquare,
  Inbox,
  Sparkles,
} from "lucide-react";
import type { Loan, LoanStatus, MeetupSpot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { SAFE_MEETUP_SPOTS } from "@/lib/geo";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewDialog } from "@/components/views/review-dialog";

export function LoanView() {
  const { loans, activeLoanId, openLoan, user, refreshLoans } = useApp();
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    void refreshLoans();
  }, [refreshLoans]);

  const activeLoan = loans.find((l) => l.id === activeLoanId) || null;

  useEffect(() => {
    // Intentional: drive mobile detail visibility from active loan
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowMobileDetail(!!activeLoan);
  }, [activeLoan]);

  if (loans.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Inbox className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="font-display text-lg font-semibold text-foreground">
            No conversations yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            When you request a book or someone requests one of yours, the chat
            will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-muted">
          <MessagesSquare className="size-4.5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Coordinate borrows, meets & returns with your neighbors
          </p>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:grid-cols-[320px_1fr] md:h-[calc(100vh-220px)]">
        {/* List pane */}
        <div
          className={cn(
            "border-r border-border bg-sidebar/50",
            showMobileDetail && "hidden md:block"
          )}
        >
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {loans.map((loan) => {
                const active = loan.id === activeLoanId;
                const isBorrower = loan.borrowerId === user?.id;
                const cp = isBorrower ? loan.lender : loan.borrower;
                return (
                  <button
                    key={loan.id}
                    onClick={() => openLoan(loan.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl p-3 text-left transition",
                      active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-secondary/50"
                    )}
                  >
                    {loan.item && (
                      <ItemCover
                        title={loan.item.title}
                        creator={loan.item.creator}
                        type={loan.item.type}
                        imageUrl={loan.item.imageUrl}
                        className="size-12 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {loan.item?.title}
                        </p>
                        <LoanStatusBadge status={loan.status} className="shrink-0" />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {isBorrower ? "from" : "to"} {cp?.name}
                      </p>
                      {loan.lastMessage && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                          {loan.lastMessage.text}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Detail pane */}
        <div className={cn("min-h-0", !showMobileDetail && "hidden md:block")}>
          {activeLoan ? (
            <LoanDetail loan={activeLoan} onBack={() => openLoan("")} />
          ) : (
            <div className="grid h-full place-items-center p-10 text-center">
              <div>
                <MessagesSquare className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">Select a conversation</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a swap from the list to open the chat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Loan detail ----------------

const lifecycleSteps: { status: LoanStatus; label: string; icon: typeof CircleDot }[] = [
  { status: "REQUESTED", label: "Requested", icon: CircleDot },
  { status: "ACCEPTED", label: "Accepted", icon: Check },
  { status: "MEETING_SCHEDULED", label: "Meetup set", icon: MapPin },
  { status: "BORROWED", label: "Borrowed", icon: Package },
  { status: "RETURNED", label: "Returned", icon: PackageCheck },
];

function statusIndex(status: LoanStatus): number {
  const idx = lifecycleSteps.findIndex((s) => s.status === status);
  if (status === "DECLINED" || status === "CANCELLED" || status === "STOLEN") return -1;
  if (status === "OVERDUE" || status === "DUE_SOON" || status === "DISPUTED") return 3;
  return idx < 0 ? 0 : idx;
}

function LoanDetail({ loan, onBack }: { loan: Loan; onBack: () => void }) {
  const { user, upsertLoan } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBorrower = loan.borrowerId === user?.id;
  const counterparty = isBorrower ? loan.lender : loan.borrower;

  // Load persisted message history
  useEffect(() => {
    let cancelled = false;
    // Intentional: reset cached history when switching loans
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingHistory(true);
    setMessages([]);
    api.messages(loan.id).then((msgs) => {
      if (cancelled) return;
      const mapped: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        loanId: loan.id,
        senderId: m.senderId,
        senderName: m.senderId === user?.id ? user?.name || "You" : counterparty?.name || "Neighbor",
        text: m.text,
        createdAt: m.createdAt,
        type: m.systemEvent ? "system" : "user",
        systemEvent: m.systemEvent || undefined,
      }));
      setMessages(mapped);
      setLoadingHistory(false);
    }).catch(() => setLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [loan.id, user?.id, user?.name, counterparty?.name]);

  const { messages: liveMessages, sendMessage, connected, broadcastStatus, broadcastMeetup } = useChat({
    loanId: loan.id,
    userId: user?.id || null,
    userName: user?.name || null,
    initialHistory: messages,
  });

  // Use live messages if they're richer, else fallback to loaded ones
  const displayMessages = liveMessages.length >= messages.length ? liveMessages : messages;

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [displayMessages.length]);

  const handleSend = (text: string) => {
    // Optimistic local append
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      loanId: loan.id,
      senderId: user?.id || "",
      senderName: user?.name || "You",
      text,
      createdAt: new Date().toISOString(),
      type: "user",
    };
    setMessages((prev) => [...prev, optimistic]);
    sendMessage(text);
  };

  const updateStatus = useCallback(
    async (status: LoanStatus, extra?: Record<string, unknown>) => {
      try {
        const updated = await api.updateLoanStatus(loan.id, status, extra);
        upsertLoan(updated);
        broadcastStatus(status);
        if (status === "RETURNED") {
          toast.success("Marked as returned. SwapScore updated!");
        } else {
          toast.success(`Status: ${status.replace(/_/g, " ").toLowerCase()}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
      }
    },
    [loan.id, upsertLoan, broadcastStatus]
  );

  const canReview =
    loan.status === "RETURNED" &&
    !loansReviewed(loan); // simple guard; backend enforces unique

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back to messages">
          <ArrowLeft className="size-5" />
        </Button>
        {loan.item && (
          <ItemCover
            title={loan.item.title}
            creator={loan.item.creator}
            type={loan.item.type}
            imageUrl={loan.item.imageUrl}
            className="size-12 shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{loan.item?.title}</p>
          <div className="flex items-center gap-2">
            {counterparty && (
              <UserAvatar name={counterparty.name} avatarUrl={counterparty.avatarUrl} size="xs" />
            )}
            <span className="truncate text-xs text-muted-foreground">
              {isBorrower ? "Borrowing from " : "Lending to "}
              <span className="font-medium text-foreground">{counterparty?.name}</span>
            </span>
          </div>
        </div>
        <LoanStatusBadge status={loan.status} />
        <span className={cn("hidden items-center gap-1 text-xs sm:flex", connected ? "text-primary" : "text-muted-foreground")}>
          {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {/* Lifecycle tracker */}
      <div className="border-b border-border bg-secondary/20 px-4 py-3">
        <div className="flex items-center justify-between">
          {lifecycleSteps.map((step, i) => {
            const current = statusIndex(loan.status);
            const done = i < current;
            const active = i === current;
            return (
              <div key={step.status} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "grid size-7 place-items-center rounded-full border-2 transition",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && "border-accent bg-accent text-accent-foreground shadow-[0_0_0_4px] shadow-accent/15",
                      !done && !active && "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : <step.icon className="size-3.5" />}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      active ? "text-accent" : done ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < lifecycleSteps.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 flex-1 rounded-full transition",
                      i < current ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action bar (role + status dependent) */}
      <ActionBar
        loan={loan}
        isBorrower={!!isBorrower}
        onUpdateStatus={updateStatus}
        onReview={() => setReviewOpen(true)}
        onReportStolen={async () => {
          if (!confirm("Report this item as stolen or lost? This will permanently close the loan, remove the item from your shelf, and suspend the borrower's account. This cannot be undone.")) return;
          try {
            const updated = await api.reportStolen(loan.id);
            upsertLoan(updated);
            broadcastStatus("STOLEN");
            toast.info("Item reported as stolen/lost. Borrower account suspended.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />

      {/* Meetup widget */}
      <MeetupWidget
        loan={loan}
        isBorrower={!!isBorrower}
        currentUserId={user?.id || ""}
        onSuggest={async (spot) => {
          try {
            const updated = await api.setMeetup(loan.id, {
              name: spot.name,
              address: spot.address,
              latitude: spot.lat,
              longitude: spot.lon,
            });
            upsertLoan(updated);
            broadcastMeetup(spot.name, spot.address);
            toast.success(`Meetup suggested at ${spot.name}`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
        onAgree={async () => {
          try {
            const updated = await api.agreeMeetup(loan.id);
            upsertLoan(updated);
            toast.success("Meetup agreed!");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-fancy bg-background p-4">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                <MessagesSquare className="mx-auto mb-2 size-6 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  Say hello — plan your meetup or ask about the item.
                </p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {displayMessages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} mine={msg.senderId === user?.id} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Composer */}
      <ChatComposer onSend={handleSend} disabled={loan.status === "DECLINED" || loan.status === "CANCELLED"} />

      <ReviewDialog loan={loan} open={reviewOpen} onOpenChange={setReviewOpen} counterpartyName={counterparty?.name || ""} />
    </div>
  );
}

function loansReviewed(_loan: Loan) {
  // Frontend guard only; backend enforces uniqueness.
  return false;
}

// ---------------- Action bar ----------------

function ActionBar({
  loan,
  isBorrower,
  onUpdateStatus,
  onReview,
  onReportStolen,
}: {
  loan: Loan;
  isBorrower: boolean;
  onUpdateStatus: (s: LoanStatus, extra?: Record<string, unknown>) => void;
  onReview: () => void;
  onReportStolen: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const s = loan.status;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    await fn();
    setBusy(false);
  }

  // Lender accepts/declines a request
  if (s === "REQUESTED" && !isBorrower) {
    return (
      <div className="flex flex-wrap gap-2 border-b border-border bg-accent/5 px-4 py-3">
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={busy}
          onClick={() => run(() => onUpdateStatus("ACCEPTED", { dueDate: loan.proposedReturnDate }))}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Accept request
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run(() => onUpdateStatus("DECLINED"))}
        >
          <X className="size-4" />
          Decline
        </Button>
        {loan.proposedReturnDate && (
          <span className="ml-auto inline-flex items-center gap-1.5 self-center text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 text-primary" />
            Proposed return: {format(new Date(loan.proposedReturnDate), "MMM d, yyyy")}
          </span>
        )}
      </div>
    );
  }

  // Borrower can cancel a pending request
  if (s === "REQUESTED" && isBorrower) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-amber-500/5 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Waiting for the lender to accept your request…
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive hover:bg-destructive/10"
          disabled={busy}
          onClick={() => run(() => onUpdateStatus("CANCELLED"))}
        >
          Cancel request
        </Button>
      </div>
    );
  }

  // After accepted / meetup set — hand off
  if ((s === "ACCEPTED" || s === "MEETING_SCHEDULED") && !isBorrower) {
    return (
      <div className="flex flex-wrap gap-2 border-b border-border bg-secondary/30 px-4 py-3">
        <Button
          size="sm"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={busy}
          onClick={() => run(() => onUpdateStatus("BORROWED"))}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
          Mark as handed over
        </Button>
        {loan.dueDate && (
          <span className="ml-auto inline-flex items-center gap-1.5 self-center text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 text-primary" />
            Due: {format(new Date(loan.dueDate), "MMM d, yyyy")}
          </span>
        )}
      </div>
    );
  }

  if ((s === "ACCEPTED" || s === "MEETING_SCHEDULED") && isBorrower) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
        <HandHelping className="size-4 text-primary" />
        Meet up and collect the item. The lender will mark it as handed over.
      </div>
    );
  }

  // Borrowed — borrower can mark returned
  if ((s === "BORROWED" || s === "OVERDUE") && isBorrower) {
    return (
      <div className="flex flex-wrap gap-2 border-b border-border bg-teal-500/5 px-4 py-3">
        {loan.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 self-center text-xs",
              s === "OVERDUE" ? "text-destructive font-semibold" : "text-muted-foreground"
            )}
          >
            <CalendarDays className={cn("size-3.5", s === "OVERDUE" ? "text-destructive" : "text-primary")} />
            {s === "OVERDUE" ? "Overdue — " : "Due "}
            {format(new Date(loan.dueDate), "MMM d, yyyy")}
            {" ("}
            {Math.abs(differenceInDays(new Date(loan.dueDate), new Date()))}
            {" days"}
            {s === "OVERDUE" ? " late)" : ")"}
          </span>
        )}
        <Button
          size="sm"
          className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={busy}
          onClick={() => run(() => onUpdateStatus("RETURNED"))}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
          Mark as returned
        </Button>
      </div>
    );
  }

  if ((s === "BORROWED" || s === "OVERDUE" || s === "DUE_SOON" || s === "DISPUTED") && !isBorrower) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-teal-500/5 px-4 py-3 text-xs text-muted-foreground">
        <Package className="size-4 text-teal-600" />
        Item is with the borrower. You'll be notified when it's returned.
        {s === "OVERDUE" && (
          <span className="ml-2 font-semibold text-destructive">This loan is overdue.</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive hover:bg-destructive/10"
          onClick={onReportStolen}
        >
          <ShieldAlert className="size-4" />
          Report stolen/lost
        </Button>
      </div>
    );
  }

  // Stolen/Lost — terminal state
  if (s === "STOLEN") {
    return (
      <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/8 px-4 py-3 text-xs text-destructive">
        <ShieldAlert className="size-4" />
        This item has been reported as stolen or lost. The loan is permanently
        closed and the borrower's account has been suspended.
      </div>
    );
  }

  // Returned — leave a review
  if (s === "RETURNED") {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <span className="text-xs text-muted-foreground">
          Swap complete. Leave a double-blind review to keep the community honest.
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={onReview}>
          <Star className="size-4 text-amber-500" />
          Review this swap
        </Button>
      </div>
    );
  }

  if (s === "DECLINED" || s === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <X className="size-4" />
        This {s === "DECLINED" ? "request was declined" : "request was cancelled"}.
      </div>
    );
  }

  return null;
}

// ---------------- Meetup widget ----------------

function MeetupWidget({
  loan,
  isBorrower,
  currentUserId,
  onSuggest,
  onAgree,
}: {
  loan: Loan;
  isBorrower: boolean;
  currentUserId: string;
  onSuggest: (spot: { name: string; address?: string; lat: number; lon: number }) => void;
  onAgree: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const meetup = loan.meetup;

  const iSuggested = meetup?.suggestedBy === currentUserId;
  const iAgreed = meetup?.agreedBy === currentUserId;

  return (
    <div className="border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent">
          <MapPin className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Safe Meetup Spot
          </p>
          {meetup ? (
            <div className="mt-0.5">
              <p className="truncate text-sm font-medium text-foreground">{meetup.name}</p>
              {meetup.address && (
                <p className="truncate text-xs text-muted-foreground">{meetup.address}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Suggest a public spot to coordinate the handoff.
            </p>
          )}
        </div>
        {meetup && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              meetup.status === "agreed"
                ? "border-primary/30 bg-primary/12 text-primary"
                : "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-400"
            )}
          >
            {meetup.status === "agreed" ? "Agreed" : "Proposed"}
          </span>
        )}
      </div>

      {meetup && meetup.status !== "agreed" && !iSuggested && (
        <Button size="sm" className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={onAgree}>
          <CheckCheck className="size-4" />
          Agree to this spot
        </Button>
      )}
      {meetup && meetup.status !== "agreed" && iSuggested && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Waiting for {isBorrower ? "lender" : "borrower"} to agree…
        </p>
      )}
      {meetup && meetup.status !== "agreed" && iAgreed && !iSuggested && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          You agreed — waiting for the other party to confirm.
        </p>
      )}

      <Button
        size="sm"
        variant={meetup ? "ghost" : "outline"}
        className={cn("mt-2 w-full", !meetup && "border-dashed")}
        onClick={() => setPickerOpen((o) => !o)}
      >
        <MapPin className="size-4" />
        {meetup ? "Suggest a different spot" : "Suggest a meetup spot"}
      </Button>

      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 grid gap-1.5 rounded-xl border border-border bg-background p-2">
              {SAFE_MEETUP_SPOTS.map((spot) => (
                <button
                  key={spot.name}
                  onClick={() => {
                    onSuggest(spot);
                    setPickerOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg p-2 text-left transition hover:bg-secondary/60"
                >
                  <div className="grid size-7 place-items-center rounded-md bg-accent/12 text-accent">
                    <MapPin className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{spot.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{spot.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Message bubble ----------------

function MessageBubble({ msg, mine }: { msg: ChatMessage; mine: boolean }) {
  if (msg.type === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
          {msg.text}
        </span>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", mine ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[78%] sm:max-w-[68%]")}>
        {!mine && (
          <p className="mb-0.5 ml-1 text-[10px] font-medium text-muted-foreground">
            {msg.senderName}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm shadow-soft",
            mine
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-card text-card-foreground border border-border"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        </div>
        <p className={cn("mt-0.5 text-[10px] text-muted-foreground", mine ? "mr-1 text-right" : "ml-1")}>
          {format(new Date(msg.createdAt), "p")}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------- Composer ----------------

function ChatComposer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? "Conversation closed" : "Type a message…"}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={submit}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
