"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import { ItemCard } from "@/components/shared/item-card";
import { SwapScoreRing } from "@/components/shared/swap-score";
import { LoanStatusBadge } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ItemCover } from "@/components/shared/item-cover";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Compass,
  BookOpen,
  Dices,
  ArrowRight,
  ArrowUpRight,
  PackageCheck,
  HandHelping,
  Clock,
  Sparkles,
  Inbox,
  Loader2,
  Wand2,
} from "lucide-react";
import type { Loan } from "@/lib/types";
import { fuzzyDistance } from "@/lib/geo";
import { toast } from "sonner";

export function DashboardView() {
  const { user, myItems, loans, setView, openLoan, setAddItemOpen, refreshMyItems, refreshLoans } = useApp();
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    void refreshMyItems();
    void refreshLoans();
  }, [refreshMyItems, refreshLoans]);

  async function handleSeed() {
    setSeeding(true);
    try {
      await api.seed();
      await Promise.all([refreshMyItems(), refreshLoans()]);
      toast.success("Demo neighbors & items added. Explore Discover!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  const isEmpty = myItems.length === 0 && loans.length === 0;

  const myId = user?.id;
  const lending = myItems;
  const borrowing = loans.filter((l) => l.borrowerId === myId);
  const lendingActive = loans.filter((l) => l.lenderId === myId);
  const incomingRequests = lendingActive.filter((l) => l.status === "REQUESTED");

  const stats = [
    {
      label: "Items on your shelf",
      value: lending.length,
      icon: BookOpen,
      tint: "bg-primary/12 text-primary",
      sub: `${lending.filter((i) => i.status === "AVAILABLE").length} available now`,
    },
    {
      label: "Currently borrowing",
      value: borrowing.filter((l) => !["RETURNED", "CANCELLED", "DECLINED"].includes(l.status)).length,
      icon: HandHelping,
      tint: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
      sub: `${borrowing.length} all-time borrows`,
    },
    {
      label: "Incoming requests",
      value: incomingRequests.length,
      icon: Inbox,
      tint: "bg-accent/15 text-accent",
      sub: incomingRequests.length ? "Needs your response" : "All caught up",
    },
    {
      label: "Items lent out",
      value: lendingActive.filter((l) => l.status === "BORROWED" || l.status === "MEETING_SCHEDULED").length,
      icon: PackageCheck,
      tint: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      sub: `${lendingActive.length} lifetime lends`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {greeting()}, welcome back
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {user?.name?.split(" ")[0]}'s Shelf
          </h1>
        </div>
        <div className="flex gap-2">
          {isEmpty && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4 text-accent" />}
              Load demo neighbors
            </Button>
          )}
          <Button variant="outline" onClick={() => setView("discover")}>
            <Compass className="size-4" />
            Discover nearby
          </Button>
          <Button
            onClick={() => setAddItemOpen(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="size-4" />
            Add to shelf
          </Button>
        </div>
      </div>

      {/* Bento stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <div className="flex items-start justify-between">
              <div className={`grid size-10 place-items-center rounded-xl ${s.tint}`}>
                <s.icon className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground/50" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-foreground">
              {s.value}
            </p>
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* SwapScore + quick actions bento */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-soft lg:col-span-2"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-center gap-6">
            <SwapScoreRing score={user?.swapScore ?? 50} size={88} />
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                <Sparkles className="size-3" />
                Your trust tier
              </div>
              <p className="mt-2 font-display text-2xl font-bold">
                {tierLabel(user?.swapScore ?? 50)}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/80">
                {user?.swapScore ?? 50 >= 85
                  ? "You're a neighborhood caretaker — keep it up!"
                  : user?.swapScore ?? 50 >= 65
                    ? "Trusted by your block. A few more clean returns to Caretaker."
                    : "Lend and return on time to climb the tiers."}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-soft"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick actions
          </p>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setAddItemOpen(true)}
            >
              <Plus className="size-4 text-accent" />
              Add an item to lend
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setView("discover")}
            >
              <Compass className="size-4 text-primary" />
              Browse nearby shelves
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                useApp.setState({ activeLoanId: null });
                setView("loan");
              }}
            >
              <Inbox className="size-4 text-amber-600" />
              {incomingRequests.length
                ? `Respond to ${incomingRequests.length} request${incomingRequests.length > 1 ? "s" : ""}`
                : "Open messages"}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Incoming requests (if any) */}
      {incomingRequests.length > 0 && (
        <section>
          <SectionHeader
            title="Needs your response"
            subtitle="Borrowers waiting to hear back"
            icon={Inbox}
            accent="text-accent"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {incomingRequests.map((loan) => (
              <RequestRow key={loan.id} loan={loan} onOpen={() => openLoan(loan.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Lending shelf */}
      <section>
        <SectionHeader
          title="Your lending shelf"
          subtitle={`${lending.length} item${lending.length === 1 ? "" : "s"} · ${lending.filter((i) => i.status === "AVAILABLE").length} available`}
          icon={BookOpen}
          accent="text-primary"
          action={
            <Button variant="ghost" size="sm" onClick={() => setAddItemOpen(true)}>
              <Plus className="size-4" />
              Add
            </Button>
          }
        />
        {lending.length === 0 ? (
          <EmptyShelf onAdd={() => setAddItemOpen(true)} onSeed={handleSeed} seeding={seeding} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {lending.map((item) => (
              <ItemCard key={item.id} item={item} showOwner={false} />
            ))}
          </div>
        )}
      </section>

      {/* Borrowing history */}
      <section>
        <SectionHeader
          title="Borrowing & lending activity"
          subtitle="Your recent swaps"
          icon={Clock}
          accent="text-teal-600 dark:text-teal-400"
        />
        {loans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Compass className="mx-auto mb-3 size-8 text-muted-foreground/60" />
            <p className="font-medium text-foreground">No swaps yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Head to Discover to request your first borrow, or add an item to
              start receiving requests.
            </p>
            <Button className="mt-4" onClick={() => setView("discover")}>
              <Compass className="size-4" />
              Discover nearby
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {loans.slice(0, 6).map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                currentUserId={myId || ""}
                onOpen={() => openLoan(loan.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function tierLabel(score: number) {
  if (score >= 85) return "Caretaker";
  if (score >= 65) return "Trusted Neighbor";
  if (score >= 40) return "Friendly";
  return "Newcomer";
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  accent,
  action,
}: {
  title: string;
  subtitle?: string;
  icon: typeof BookOpen;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-muted">
          <Icon className={`size-4.5 ${accent || "text-muted-foreground"}`} />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyShelf({ onAdd, onSeed, seeding }: { onAdd: () => void; onSeed: () => void; seeding: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="mx-auto mb-4 flex w-fit gap-2">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary">
          <BookOpen className="size-6" />
        </div>
        <div className="grid size-12 place-items-center rounded-xl bg-accent/15 text-accent">
          <Dices className="size-6" />
        </div>
      </div>
      <p className="font-display text-lg font-semibold text-foreground">
        Your shelf is empty
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Add your first book or board game. Scan a barcode and we'll fetch the
        details for you — or load some demo neighbors to explore.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={onAdd}>
          <Plus className="size-4" />
          Add your first item
        </Button>
        <Button variant="outline" onClick={onSeed} disabled={seeding}>
          {seeding ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4 text-accent" />}
          Load demo data
        </Button>
      </div>
    </div>
  );
}

function RequestRow({ loan, onOpen }: { loan: Loan; onOpen: () => void }) {
  const borrower = loan.borrower;
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-left transition hover:bg-accent/10"
    >
      {loan.item && (
        <ItemCover
          title={loan.item.title}
          creator={loan.item.creator}
          type={loan.item.type}
          imageUrl={loan.item.imageUrl}
          className="size-14 shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">
          {loan.item?.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {borrower && (
            <UserAvatar name={borrower.name} avatarUrl={borrower.avatarUrl} size="xs" />
          )}
          <span className="text-xs text-muted-foreground">
            {borrower?.name} wants to borrow
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <LoanStatusBadge status={loan.status} />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
          Respond <ArrowRight className="size-3" />
        </span>
      </div>
    </button>
  );
}

function LoanRow({
  loan,
  currentUserId,
  onOpen,
}: {
  loan: Loan;
  currentUserId: string;
  onOpen: () => void;
}) {
  const isBorrower = loan.borrowerId === currentUserId;
  const counterparty = isBorrower ? loan.lender : loan.borrower;
  const item = loan.item;
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30 hover:shadow-soft"
    >
      {item && (
        <ItemCover
          title={item.title}
          creator={item.creator}
          type={item.type}
          imageUrl={item.imageUrl}
          className="size-12 shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item?.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {isBorrower ? "Borrowing from" : "Lending to"}{" "}
          <span className="font-medium text-foreground">{counterparty?.name}</span>
          {counterparty?.neighborhood && ` · ${counterparty.neighborhood}`}
        </p>
      </div>
      {loan.lastMessage && (
        <p className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:block">
          “{loan.lastMessage.text}”
        </p>
      )}
      <LoanStatusBadge status={loan.status} />
    </button>
  );
}
