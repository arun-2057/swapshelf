"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/store/app-store";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Dices, ArrowLeft, ArrowRight, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

export function AuthView({ mode }: { mode: "login" | "signup" }) {
  const { doLogin, doSignup, setView } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (isSignup) {
        if (!name.trim() || !email.trim() || password.length < 6) {
          toast.error("Please fill all fields (password 6+ chars).");
          setBusy(false);
          return;
        }
        await doSignup(name.trim(), email.trim(), password);
        toast.success("Welcome to SwapShelf! Let's set your home base.");
      } else {
        await doLogin(email.trim(), password);
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background paper-texture">
      <header className="border-b border-border/60 glass-strong">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => setView("landing")}>
            <Logo />
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("landing")}
          >
            <ArrowLeft className="size-4" />
            Back home
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-16">
        {/* Left visual */}
        <div className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/80 p-10 text-primary-foreground shadow-lift"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 size-56 rounded-full bg-secondary/20 blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex gap-2">
                <div className="grid size-10 place-items-center rounded-xl bg-white/15">
                  <BookOpen className="size-5" />
                </div>
                <div className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Dices className="size-5" />
                </div>
              </div>
              <h2 className="font-display text-4xl font-bold leading-tight text-balance">
                {isSignup
                  ? "Your shelf is about to become the neighborhood's favorite corner."
                  : "Welcome back to the warmest library in town."}
              </h2>
              <p className="text-primary-foreground/80">
                {isSignup
                  ? "Add your books and board games, set a home base, and start swapping within minutes — no fees, no shipping, just your block."
                  : "Sign in to check your borrow requests, reply to your neighbors, and keep your SwapScore climbing."}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {[
                  "Free forever",
                  "Private by design",
                  "Real meetups, real neighbors",
                ].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="rounded-2xl border border-border bg-card p-7 shadow-soft sm:p-8">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {isSignup ? "Create your shelf" : "Sign in"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignup
                ? "Join the hyper-local media exchange."
                : "Pick up where you left off."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {isSignup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="name">Display name</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Chen"
                        className="pl-9"
                        autoComplete="name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                  {isSignup && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (6+ characters)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                    autoComplete={
                      isSignup ? "new-password" : "current-password"
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                size="lg"
              >
                {busy
                  ? "One moment…"
                  : isSignup
                    ? "Create my shelf"
                    : "Sign in"}
                {!busy && <ArrowRight className="size-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? "Already on SwapShelf?" : "New to the neighborhood?"}{" "}
              <button
                onClick={() => setView(isSignup ? "login" : "signup")}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {isSignup ? "Sign in instead" : "Create a shelf"}
              </button>
            </p>
          </div>

          <p className="mt-4 px-2 text-center text-xs text-muted-foreground">
            Demo tip: use any email & password (6+ chars). Your data stays in
            this sandbox.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
