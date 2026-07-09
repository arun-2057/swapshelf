"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LoanStatusBadge } from "@/components/shared/badges";
import {
  Shield,
  AlertTriangle,
  Gavel,
  Check,
  X,
  Ban,
  Loader2,
  Clock,
  MapPin,
  ImageIcon,
  MessageSquare,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Dispute {
  id: string;
  status: string;
  title: string;
  type: string;
  imageUrl: string | null;
  flagged: boolean;
  borrower: { id: string; name: string; email: string; swapScore: number; frozen: boolean; neighborhood: string | null };
  lender: { id: string; name: string; email: string; swapScore: number; frozen: boolean; neighborhood: string | null };
  dueDate: string | null;
  resolvedAt: string | null;
  moderatorId: string | null;
  createdAt: string;
  updatedAt: string;
  returnVerification: {
    id: string;
    conditionRating: string;
    missingComponents: string[];
    notes: string | null;
    evidenceImageUrl: string | null;
    status: string;
    createdAt: string;
  } | null;
  recentMessages: Array<{
    id: string;
    senderId: string | null;
    senderName: string;
    text: string;
    systemEvent: string | null;
    createdAt: string;
  }>;
}

interface FullMessage {
  id: string;
  senderName: string;
  senderAvatarUrl: string | null;
  text: string;
  systemEvent: string | null;
  isSystem: boolean;
  createdAt: string;
}

export function AdminDashboard() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [fullChatOpen, setFullChatOpen] = useState(false);
  const [fullChat, setFullChat] = useState<FullMessage[]>([]);
  const [fullChatLoading, setFullChatLoading] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await api.adminDisputes();
      setDisputes(res.disputes);
      if (res.disputes.length > 0 && !selectedId) {
        setSelectedId(res.disputes[0].id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchDisputes(); }, []);

  const selected = disputes.find((d) => d.id === selectedId);

  // Load the FULL chat history via the privileged admin route (not
  // just the 50-message preview from the disputes list).
  async function loadFullChat(loanId: string) {
    setFullChatOpen(true);
    setFullChatLoading(true);
    setFullChat([]);
    try {
      const msgs = await api.adminMessages(loanId);
      setFullChat(msgs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setFullChatLoading(false);
    }
  }

  async function resolve(action: "AWARD_LENDER" | "CLOSE_WITHOUT_PENALTY" | "BAN_USER") {
    if (!selectedId || resolving) return;
    const labels: Record<typeof action, string> = {
      AWARD_LENDER: "Award to lender (dock borrower SwapScore)?",
      CLOSE_WITHOUT_PENALTY: "Close without penalty (no SwapScore change)?",
      BAN_USER: "Ban the borrower (freeze account, mark item stolen)? This cannot be undone.",
    };
    if (!confirm(labels[action])) return;

    setResolving(true);
    try {
      await api.adminResolve(selectedId, action);
      toast.success("Dispute resolved.");
      await fetchDisputes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve");
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-destructive/12 text-destructive">
          <Shield className="size-5.5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Moderation Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {disputes.length} active {disputes.length === 1 ? "dispute" : "disputes"} requiring review
          </p>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <Check className="mx-auto mb-3 size-10 text-primary" />
          <p className="font-display text-lg font-semibold text-foreground">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No active disputes or stolen items. The community is thriving.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr_280px]">
          {/* Left: Flagged items list */}
          <div className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dispute Queue
            </p>
            <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto scroll-fancy pr-1">
              {disputes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selectedId === d.id
                      ? "border-accent bg-accent/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Package className="size-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <LoanStatusBadge status={d.status as never} />
                    <span className="truncate text-[11px] text-muted-foreground">
                      {d.borrower.name} ↔ {d.lender.name}
                    </span>
                  </div>
                  {d.returnVerification && (
                    <p className="mt-1 text-[10px] text-destructive">
                      Condition: {d.returnVerification.conditionRating.toLowerCase()}
                      {d.returnVerification.evidenceImageUrl && " · 📸 evidence"}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Center: Context panel */}
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Item + parties */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-foreground">{selected.title}</h2>
                  <LoanStatusBadge status={selected.status as never} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Borrower</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <UserAvatar name={selected.borrower.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{selected.borrower.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{selected.borrower.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="text-muted-foreground">SwapScore: {selected.borrower.swapScore}</span>
                      {selected.borrower.frozen && (
                        <span className="rounded bg-destructive/15 px-1.5 py-0.5 font-bold text-destructive">FROZEN</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lender</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <UserAvatar name={selected.lender.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{selected.lender.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{selected.lender.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="text-muted-foreground">SwapScore: {selected.lender.swapScore}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return verification + evidence */}
              {selected.returnVerification && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    <h3 className="text-sm font-semibold text-foreground">Return Verification</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition:</span>
                      <span className="font-medium text-foreground">{selected.returnVerification.conditionRating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-foreground">{selected.returnVerification.status}</span>
                    </div>
                    {selected.returnVerification.missingComponents.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Issues:</span>
                        <ul className="mt-1 space-y-0.5">
                          {selected.returnVerification.missingComponents.map((m) => (
                            <li key={m} className="flex items-center gap-1.5 text-xs text-destructive">
                              <X className="size-3" />{m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selected.returnVerification.notes && (
                      <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
                        "{selected.returnVerification.notes}"
                      </div>
                    )}
                    {selected.returnVerification.evidenceImageUrl && (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <img
                          src={selected.returnVerification.evidenceImageUrl}
                          alt="Damage evidence"
                          className="max-h-64 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chat log preview */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Recent Messages</h3>
                </div>
                <div className="max-h-48 space-y-1.5 overflow-y-auto scroll-fancy">
                  {selected.recentMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No messages in this conversation.</p>
                  ) : (
                    selected.recentMessages.map((m) => (
                      <div key={m.id} className="rounded-lg px-2 py-1 text-xs">
                        {m.systemEvent ? (
                          <span className="text-muted-foreground italic">{m.text}</span>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">
                              {m.senderName}:
                            </span>{" "}
                            <span className="text-muted-foreground">{m.text}</span>
                          </>
                        )}
                        <span className="ml-2 text-[10px] text-muted-foreground/60">
                          {format(new Date(m.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {selected.recentMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-xs"
                    onClick={() => loadFullChat(selected.id)}
                  >
                    <MessageSquare className="size-3" />
                    View full chat history
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Right: Resolution toolbar */}
          {selected && (
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <Gavel className="size-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">Resolution</h3>
                </div>
                <div className="space-y-2">
                  <Button
                    className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={resolving}
                    onClick={() => resolve("AWARD_LENDER")}
                  >
                    <Check className="size-4" />
                    Award to lender
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={resolving}
                    onClick={() => resolve("CLOSE_WITHOUT_PENALTY")}
                  >
                    <X className="size-4" />
                    Close (no penalty)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={resolving}
                    onClick={() => resolve("BAN_USER")}
                  >
                    {resolving ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                    Ban borrower
                  </Button>
                </div>
                {selected.resolvedAt && (
                  <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Clock className="mr-1 inline size-3" />
                    Resolved {format(new Date(selected.resolvedAt), "MMM d, yyyy h:mm a")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full chat history dialog */}
      <Dialog open={fullChatOpen} onOpenChange={setFullChatOpen}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
          <DialogHeader className="border-b border-border bg-secondary/30 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <MessageSquare className="size-4 text-primary" />
              Full Chat History
            </DialogTitle>
            <DialogDescription>
              {selected?.title} — {selected?.borrower.name} ↔ {selected?.lender.name}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto scroll-fancy p-4">
            {fullChatLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : fullChat.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No messages found.</p>
            ) : (
              <div className="space-y-2">
                {fullChat.map((m) => (
                  <div key={m.id} className="rounded-lg px-3 py-2 text-sm">
                    {m.isSystem ? (
                      <span className="text-muted-foreground italic">{m.text}</span>
                    ) : (
                      <div className="flex items-start gap-2">
                        <UserAvatar name={m.senderName} avatarUrl={m.senderAvatarUrl} size="xs" />
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-foreground">{m.senderName}</span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {format(new Date(m.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{m.text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
