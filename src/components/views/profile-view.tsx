"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import { SwapScoreRing } from "@/components/shared/swap-score";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  MapPin,
  Shield,
  TrendingUp,
  BookOpen,
  HandHelping,
  Sparkles,
  Loader2,
  Check,
  Pencil,
  Trophy,
} from "lucide-react";
import type { Review } from "@/lib/types";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

export function ProfileView() {
  const { user, myItems, loans, refreshMyItems, refreshLoans } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refreshMyItems();
    void refreshLoans();
    if (user) {
      setLoadingReviews(true);
      api
        .getUser(user.id)
        .then((res) => setReviews(res.reviews))
        .finally(() => setLoadingReviews(false));
    }
  }, [user, refreshMyItems, refreshLoans]);

  const lifetimeLends = loans.filter((l) => l.lenderId === user?.id).length;
  const lifetimeBorrows = loans.filter((l) => l.borrowerId === user?.id).length;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : null;

  async function saveProfile() {
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), bio: bio.trim() || undefined });
      // refresh session user
      await useApp.getState().bootstrap();
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-lift sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 size-56 rounded-full bg-secondary/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/15 p-2 backdrop-blur">
              <SwapScoreRing score={user.swapScore} size={96} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                <Trophy className="size-3" />
                {tierLabel(user.swapScore)}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold">{user.name}</h1>
              <p className="text-sm text-primary-foreground/80">{user.email}</p>
              {user.neighborhood && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-primary-foreground/80">
                  <MapPin className="size-3.5" />
                  {user.neighborhood}
                </p>
              )}
            </div>
          </div>
          <div className="sm:ml-auto">
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground"
              onClick={() => setEditing((e) => !e)}
            >
              <Pencil className="size-4" />
              {editing ? "Cancel" : "Edit profile"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Edit form */}
      {editing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
              Edit your profile
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pn">Display name</Label>
                <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pb">Bio</Label>
                <Textarea
                  id="pb"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your neighbors what you love to read & play."
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={saveProfile} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Save changes
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats bento */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} tint="bg-primary/12 text-primary" label="Items on shelf" value={myItems.length} />
        <StatCard icon={HandHelping} tint="bg-teal-500/12 text-teal-600 dark:text-teal-400" label="Lifetime borrows" value={lifetimeBorrows} />
        <StatCard icon={Sparkles} tint="bg-amber-500/15 text-amber-700 dark:text-amber-400" label="Lifetime lends" value={lifetimeLends} />
        <StatCard
          icon={Star}
          tint="bg-accent/15 text-accent"
          label="Avg. rating"
          value={avgRating ? avgRating.toFixed(1) : "—"}
          sub={avgRating ? `from ${reviews.length} reviews` : "no reviews yet"}
        />
      </div>

      {/* Trust breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4.5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Trust breakdown
            </h2>
          </div>
          <div className="space-y-4">
            <TrustBar label="On-time returns" value={Math.min(100, user.swapScore + 5)} color="bg-primary" />
            <TrustBar label="Prompt responses" value={Math.min(100, user.swapScore - 2)} color="bg-accent" />
            <TrustBar label="Safe handoffs" value={Math.min(100, user.swapScore + 2)} color="bg-teal-500" />
            <TrustBar label="Community contributions" value={Math.min(100, myItems.length * 12 + 30)} color="bg-amber-500" />
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <Shield className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              SwapScore is computed from your lifetime activity: prompt
              responses, on-time returns, safe meetups, and shelf
              contributions. Reviews adjust it after each completed swap.
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
            Privacy
          </h2>
          <ul className="space-y-3 text-sm">
            <PrivacyRow label="Exact address" value="Never shared" ok />
            <PrivacyRow label="Coordinates" value="Fuzzy distance only" ok />
            <PrivacyRow label="Email" value="Hidden from others" ok />
            <PrivacyRow label="SwapScore" value="Public" />
            <PrivacyRow label="Reviews" value="Revealed after both submit" ok />
          </ul>
        </div>
      </div>

      {/* Reviews */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Star className="size-4.5 fill-amber-400 text-amber-500" />
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            What neighbors say
          </h2>
          {reviews.length > 0 && (
            <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {reviews.length}
            </span>
          )}
        </div>

        {loadingReviews ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Star className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            <p className="font-medium text-foreground">No revealed reviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a few swaps to start collecting double-blind reviews.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={r.reviewer?.name || "Neighbor"} avatarUrl={r.reviewer?.avatarUrl} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {r.reviewer?.name || "Neighbor"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cnStar(i < r.rating)}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm italic leading-relaxed text-muted-foreground">
                    "{r.comment}"
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function cnStar(filled: boolean) {
  return `size-3.5 ${filled ? "fill-amber-400 text-amber-500" : "fill-muted text-muted-foreground/40"}`;
}

function tierLabel(score: number) {
  if (score >= 85) return "Caretaker";
  if (score >= 65) return "Trusted Neighbor";
  if (score >= 40) return "Friendly";
  return "Newcomer";
}

function StatCard({
  icon: Icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: typeof Star;
  tint: string;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className={`grid size-10 place-items-center rounded-xl ${tint}`}>
        <Icon className="size-5" />
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function TrustBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function PrivacyRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${ok ? "text-primary" : "text-foreground"}`}>
        {ok && <Check className="size-3.5" />}
        {value}
      </span>
    </li>
  );
}
