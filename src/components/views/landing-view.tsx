"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/store/app-store";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Dices,
  MapPin,
  Shield,
  Sparkles,
  ScanLine,
  MessagesSquare,
  Star,
  ArrowRight,
  Leaf,
  HandHeart,
  CalendarCheck,
} from "lucide-react";
import { ItemCover } from "@/components/shared/item-cover";
import { SwapScoreBadge } from "@/components/shared/swap-score";

const shelfItems = [
  { title: "The Name of the Wind", creator: "Patrick Rothfuss", type: "BOOK" as const },
  { title: "Wingspan", creator: "Stonemaier Games", type: "BOARD_GAME" as const },
  { title: "Dune", creator: "Frank Herbert", type: "BOOK" as const },
  { title: "Catan", creator: "Klaus Teuber", type: "BOARD_GAME" as const },
  { title: "The Midnight Library", creator: "Matt Haig", type: "BOOK" as const },
  { title: "Azul", creator: "Next Move Games", type: "BOARD_GAME" as const },
];

const features = [
  {
    icon: ScanLine,
    title: "Scan to shelve",
    body: "Snap a barcode and we'll pull cover art, author, and edition details from Open Library & BoardGameGeek — no typing.",
    accent: "text-accent",
  },
  {
    icon: MapPin,
    title: "Hyper-local discovery",
    body: "Tune your radius from 1 to 5 miles. We never reveal your address — only a fuzzy '0.4 miles away' reading.",
    accent: "text-primary",
  },
  {
    icon: MessagesSquare,
    title: "Built-in coordination",
    body: "Every borrow opens a private chat with a pinned meetup widget so you can agree on a safe, public spot.",
    accent: "text-teal-600 dark:text-teal-400",
  },
  {
    icon: Shield,
    title: "Double-blind trust",
    body: "Reviews stay sealed until both sides submit — no retaliation, just honest neighborhood reputation.",
    accent: "text-amber-600 dark:text-amber-400",
  },
];

const steps = [
  {
    icon: BookOpen,
    title: "Shelve what you own",
    body: "Add books and board games to your digital shelf in seconds. Scan, snap, or type — your collection becomes a neighborhood asset.",
  },
  {
    icon: HandHeart,
    title: "Request or lend",
    body: "Browse what's nearby, propose a return date, and lenders get a one-tap accept. Your shelf starts earning SwapScore.",
  },
  {
    icon: CalendarCheck,
    title: "Meet, swap, repeat",
    body: "Agree on a safe public meetup, hand off the item, and return it on time. Every clean cycle lifts your trust tier.",
  },
];

interface PlatformStats {
  itemsCirculating: number;
  activeShelves: number;
  activeLoans: number;
  completedSwaps: number;
  onTimeReturns: number;
  avgSwapScore: number;
}

interface Testimonial {
  quote: string;
  authorName: string;
  authorInitial: string;
  avatarUrl: string | null;
  neighborhood: string;
  swaps: number;
  tier: string;
  itemName: string;
  rating: number;
}

export function LandingView() {
  const { setView } = useApp();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [testimonial, setTestimonial] = useState<Testimonial | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch("/api/testimonial")
      .then((r) => r.json())
      .then((d) => setTestimonial(d.testimonial))
      .catch(() => {});
  }, []);

  const statsArray = stats
    ? [
        { stat: stats.itemsCirculating.toLocaleString(), label: "Items circulating" },
        { stat: stats.activeShelves.toLocaleString(), label: "Active shelves" },
        { stat: stats.completedSwaps.toLocaleString(), label: "Completed swaps" },
        { stat: `${stats.onTimeReturns}%`, label: "On-time returns" },
      ]
    : [
        { stat: "—", label: "Items circulating" },
        { stat: "—", label: "Active shelves" },
        { stat: "—", label: "Completed swaps" },
        { stat: "—", label: "On-time returns" },
      ];

  return (
    <div className="flex min-h-screen flex-col bg-background paper-texture">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 glass-strong">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition hover:text-foreground">
              How it works
            </a>
            <a href="#trust" className="transition hover:text-foreground">
              Trust
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("login")}
              className="hidden sm:inline-flex"
            >
              Sign in
            </Button>
            <Button
              size="sm"
              onClick={() => setView("signup")}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Join the shelf
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <Leaf className="size-3.5 text-primary" />
              <span>Books & board games, borrowed from your block</span>
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground text-balance sm:text-6xl">
              The library that{" "}
              <span className="relative whitespace-nowrap text-primary">
                lives
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 9C40 3 160 3 198 9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-accent"
                  />
                </svg>
              </span>{" "}
              on your street.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              SwapShelf turns your bookshelf and game closet into a shared
              neighborhood library. Lend what you've loved, borrow what you've
              been curious about, and meet the readers & players next door.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={() => setView("signup")}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Create your shelf
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView("login")}
              >
                I already have an account
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-5 pt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="size-4 text-primary" />
                Address always private
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-accent" />
                Free forever
              </span>
              <SwapScoreBadge score={92} />
            </div>
          </motion.div>

          {/* Floating shelf visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md">
              {/* shelf board */}
              <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-lift glass">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">
                      Maple Heights · 3 mi
                    </p>
                    <p className="text-xs text-muted-foreground">
                      42 shelves nearby
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <div className="size-2 rounded-full bg-accent" />
                    <div className="size-2 rounded-full bg-primary/40" />
                    <div className="size-2 rounded-full bg-primary/40" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {shelfItems.map((it, i) => (
                    <motion.div
                      key={it.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      whileHover={{ y: -4, scale: 1.03 }}
                    >
                      <ItemCover
                        {...it}
                        className="aspect-[2/3] w-full"
                      />
                    </motion.div>
                  ))}
                </div>
                {/* shelf rail */}
                <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-primary/30 via-secondary to-primary/30" />
              </div>

              {/* floating chips */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute -left-4 top-10 hidden rounded-xl border border-border bg-card p-3 shadow-lift sm:block"
              >
                <div className="flex items-center gap-2">
                  <div className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent">
                    <ScanLine className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">ISBN scanned</p>
                    <p className="text-[10px] text-muted-foreground">
                      "Dune" · found ✓
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.75 }}
                className="absolute -right-4 bottom-12 hidden rounded-xl border border-border bg-card p-3 shadow-lift sm:block"
              >
                <div className="flex items-center gap-2">
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Meetup agreed</p>
                    <p className="text-[10px] text-muted-foreground">
                      Maple & Vine Coffee
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip — real-time from /api/stats */}
      <section className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
          {statsArray.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {s.stat}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">
            Why SwapShelf
          </p>
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground text-balance">
            Built for the way neighborhoods actually share.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.06 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
            >
              <div
                className={`mb-4 grid size-11 place-items-center rounded-xl bg-muted ${f.accent}`}
              >
                <f.icon className="size-5" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br from-secondary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground text-balance">
              Three steps to a shared shelf.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl border border-border bg-card p-7 shadow-soft"
              >
                <span className="absolute right-6 top-5 font-display text-6xl font-bold text-secondary/60">
                  {i + 1}
                </span>
                <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                  <s.icon className="size-5" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / quote */}
      <section id="trust" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/85 p-10 text-primary-foreground shadow-lift sm:p-14"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-accent/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-secondary/20 blur-2xl" />
          <div className="relative space-y-5">
            <Star className="size-8 fill-accent text-accent" />
            <blockquote className="font-display text-2xl font-medium leading-snug text-balance sm:text-3xl">
              {testimonial ? (
                `"${testimonial.quote}"`
              ) : (
                "Join SwapShelf and be the first neighbor to share a review. Your story could be featured here."
              )}
            </blockquote>
            <div className="flex items-center gap-3">
              {testimonial ? (
                <>
                  {testimonial.avatarUrl ? (
                    <img
                      src={testimonial.avatarUrl}
                      alt={testimonial.authorName}
                      className="size-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground font-display font-bold">
                      {testimonial.authorInitial}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{testimonial.authorName}</p>
                    <p className="text-sm text-primary-foreground/70">
                      {testimonial.neighborhood} · {testimonial.swaps} swap{testimonial.swaps === 1 ? "" : "s"} · {testimonial.tier} tier
                    </p>
                  </div>
                </>
              ) : (
                <div className="grid size-11 place-items-center rounded-full bg-accent/50 text-accent-foreground font-display font-bold">
                  ?
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10 text-center shadow-soft sm:p-14">
          <Dices className="size-10 text-accent" />
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Your shelf is already a library. Let your neighbors in.
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Free to join, free to borrow, free to lend. The only cost is showing
            up to a coffee shop with a good book.
          </p>
          <Button
            size="lg"
            onClick={() => setView("signup")}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Build your shelf
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      {/* Footer (sticky to bottom) */}
      <footer className="mt-auto border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SwapShelf · Built for warm,
            trustworthy neighborhoods.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Privacy first</span>
            <span>·</span>
            <span>Community-driven</span>
            <span>·</span>
            <span>Open shelves</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
