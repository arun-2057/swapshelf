"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SwapScoreRing } from "@/components/shared/swap-score";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Compass,
  MessagesSquare,
  UserRound,
  Plus,
  LogOut,
  Menu,
  Bell,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppView } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  view: AppView;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, view, setView, doLogout, loans, setAddItemOpen } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const incomingRequests = loans.filter(
    (l) => l.lenderId === user?.id && l.status === "REQUESTED"
  ).length;

  const navItems: NavItem[] = [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { view: "discover", label: "Discover", icon: Compass },
    {
      view: "loan",
      label: "Messages",
      icon: MessagesSquare,
      badge: incomingRequests || undefined,
    },
    { view: "profile", label: "Profile", icon: UserRound },
  ];

  // When the user clicks "Messages" with no active loan, we still show
  // the loan list view. The loan view component handles both list + detail.
  function handleNav(v: AppView) {
    if (v === "loan") {
      useApp.setState({ activeLoanId: null });
    }
    setView(v);
    setMobileOpen(false);
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <button onClick={() => handleNav("dashboard")}>
          <Logo />
        </button>
      </div>

      {/* User card */}
      <div className="mx-3 mb-4 rounded-xl border border-border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-3">
          <UserAvatar name={user?.name || "?"} avatarUrl={user?.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.neighborhood || "Your block"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2">
          <SwapScoreRing score={user?.swapScore ?? 50} size={40} />
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              SwapScore
            </p>
            <p className="font-display text-sm font-bold text-foreground">
              {user?.swapScore ?? 50} / 100
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active =
            view === item.view ||
            (item.view === "loan" && view === "loan");
          return (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "size-4.5 shrink-0",
                  active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-accent text-accent-foreground"
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 p-3">
        <Button
          onClick={() => setAddItemOpen(true)}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="size-4" />
          Add to shelf
        </Button>
        <button
          onClick={doLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/8 hover:text-destructive"
        >
          <LogOut className="size-4.5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-sidebar lg:block">
        {SidebarContent}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">SwapShelf navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Navigate your dashboard, discover nearby shelves, and manage messages.
              </SheetDescription>
              {SidebarContent}
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Logo size="sm" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => handleNav("loan")}
              aria-label={`Notifications${incomingRequests > 0 ? `, ${incomingRequests} new` : ""}`}
            >
              <Bell className="size-5" />
              {incomingRequests > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />
              )}
            </Button>
            <Button
              onClick={() => setAddItemOpen(true)}
              size="sm"
              className="hidden bg-accent text-accent-foreground hover:bg-accent/90 sm:inline-flex"
            >
              <Plus className="size-4" />
              Add to shelf
            </Button>
            <button
              onClick={() => handleNav("profile")}
              aria-label={`View profile: ${user?.name || "Account"}`}
              className="ml-1 rounded-full ring-offset-background transition hover:ring-2 hover:ring-primary/40"
            >
              <UserAvatar name={user?.name || "?"} avatarUrl={user?.avatarUrl} size="sm" />
            </button>
          </div>
        </header>

        {/* Skip-to-content link for keyboard / screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to content
        </a>

        <main id="main-content" className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view + (useApp.getState().activeLoanId ?? "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-auto border-t border-border bg-secondary/30 px-6 py-4 text-center text-xs text-muted-foreground">
          SwapShelf · {new Date().getFullYear()} · Borrow bravely, return kindly.
        </footer>
      </div>
    </div>
  );
}
