"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import { ItemCard } from "@/components/shared/item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Search,
  LayoutGrid,
  MapIcon,
  SlidersHorizontal,
  MapPin,
  Compass,
  X,
  Loader2,
  BookOpen,
  Dices,
  Sparkles,
} from "lucide-react";
import type { Item, ItemType, ItemCondition } from "@/lib/types";
import { fuzzyDistance } from "@/lib/geo";
import { toast } from "sonner";
import { RequestLoanDialog } from "@/components/views/request-loan-dialog";

export function DiscoverView() {
  const { user, filters, setFilters, discoverItems, discoverLoading, refreshDiscover } =
    useApp();
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [requestItem, setRequestItem] = useState<Item | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    void refreshDiscover();
  }, [refreshDiscover]);

  // Group items into map clusters by owner (each owner = one pin)
  const clusters = useMemo(() => {
    const byOwner = new Map<string, { item: Item; count: number }>();
    for (const it of discoverItems) {
      const key = it.owner?.id || "unknown";
      const existing = byOwner.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byOwner.set(key, { item: it, count: 1 });
      }
    }
    return Array.from(byOwner.values());
  }, [discoverItems]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-semibold text-accent">
            <Compass className="size-3" />
            Discover
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Shelves near {user?.neighborhood || "you"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {discoverItems.length} item{discoverItems.length === 1 ? "" : "s"} within{" "}
            {filters.radiusMiles} mile{filters.radiusMiles === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "grid" | "map")}
            className="rounded-lg border border-border bg-card p-0.5"
          >
            <ToggleGroupItem
              value="grid"
              className="gap-1.5 rounded-md px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <LayoutGrid className="size-4" /> Grid
            </ToggleGroupItem>
            <ToggleGroupItem
              value="map"
              className="gap-1.5 rounded-md px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <MapIcon className="size-4" /> Map
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Search + radius slider */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(e) => setFilters({ query: e.target.value })}
              placeholder="Search titles, authors, designers…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-3 lg:w-72">
            <Label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-accent" />
              Radius
            </Label>
            <Slider
              value={[filters.radiusMiles]}
              onValueChange={(v) => setFilters({ radiusMiles: v[0] })}
              min={1}
              max={5}
              step={0.5}
              className="flex-1"
            />
            <span className="w-12 text-right text-sm font-semibold text-foreground">
              {filters.radiusMiles} mi
            </span>
          </div>

          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((s) => !s)}
            className="lg:w-auto"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(v) => setFilters({ type: v as ItemType | "ALL" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All media</SelectItem>
                      <SelectItem value="BOOK">
                        <span className="flex items-center gap-2">
                          <BookOpen className="size-4" /> Books
                        </span>
                      </SelectItem>
                      <SelectItem value="BOARD_GAME">
                        <span className="flex items-center gap-2">
                          <Dices className="size-4" /> Board games
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Condition</Label>
                  <Select
                    value={filters.condition}
                    onValueChange={(v) =>
                      setFilters({ condition: v as ItemCondition | "ALL" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Any condition</SelectItem>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="LIKE_NEW">Like new</SelectItem>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="FAIR">Fair</SelectItem>
                      <SelectItem value="WORN">Well-loved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Availability</Label>
                  <Select
                    value={filters.availability}
                    onValueChange={(v) =>
                      setFilters({ availability: v as "available" | "all" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available only</SelectItem>
                      <SelectItem value="all">Show all</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      {discoverLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      ) : discoverItems.length === 0 ? (
        <EmptyDiscover onExpand={() => setFilters({ radiusMiles: 5, type: "ALL", condition: "ALL", availability: "all" })} />
      ) : viewMode === "grid" ? (
        <motion.div
          layout
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          <AnimatePresence>
            {discoverItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => setRequestItem(item)}
                footer={
                  <Button
                    size="sm"
                    className="mt-2 w-full bg-accent/90 text-accent-foreground hover:bg-accent"
                    disabled={item.status !== "AVAILABLE"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRequestItem(item);
                    }}
                  >
                    {item.status === "AVAILABLE" ? "Request to borrow" : "Unavailable"}
                  </Button>
                }
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <MapView clusters={clusters} userLat={user?.latitude || 0} userLon={user?.longitude || 0} radius={filters.radiusMiles} onSelect={setRequestItem} />
      )}

      <RequestLoanDialog
        item={requestItem}
        onClose={() => setRequestItem(null)}
      />
    </div>
  );
}

function MapView({
  clusters,
  userLat,
  userLon,
  radius,
  onSelect,
}: {
  clusters: { item: Item; count: number }[];
  userLat: number;
  userLon: number;
  radius: number;
  onSelect: (item: Item) => void;
}) {
  // Project relative lat/lon deltas into a 0-100% box. We scale so the
  // user sits in the center and `radius` miles roughly fills the view.
  const projected = clusters.map((c) => {
    const dLat = (c.item.owner?.id ? 0 : 0) as number; // unused
    // We use the item's distanceMiles + a deterministic angle to scatter.
    const angle = hashAngle(c.item.id);
    const dist = c.item.distanceMiles ?? Math.random() * radius;
    const norm = Math.min(dist / radius, 0.95); // 0..0.95
    const x = 50 + Math.cos(angle) * norm * 45;
    const y = 50 + Math.sin(angle) * norm * 45;
    return { ...c, x, y };
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-primary/5 via-secondary/30 to-accent/5">
        {/* faux street grid */}
        <svg className="absolute inset-0 size-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/40" />
            </pattern>
            <pattern id="grid2" width="240" height="240" patternUnits="userSpaceOnUse">
              <path d="M 240 0 L 0 0 0 240" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/60" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#grid2)" />
          {/* a couple of "parks" */}
          <rect x="15%" y="60%" width="22%" height="22%" rx="8" className="fill-primary/15" />
          <rect x="62%" y="12%" width="26%" height="20%" rx="8" className="fill-primary/12" />
          {/* a "river" */}
          <path d="M 0 78% Q 30% 70% 50% 80% T 100% 74%" stroke="currentColor" strokeWidth="14" fill="none" className="text-teal-500/20" />
        </svg>

        {/* radius ring around user */}
        <div
          className="absolute rounded-full border-2 border-dashed border-primary/40"
          style={{
            left: "50%",
            top: "50%",
            width: "80%",
            height: "80%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* user marker */}
        <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
          <div className="relative grid place-items-center">
            <span className="absolute size-10 animate-ping rounded-full bg-primary/20" />
            <span className="grid size-5 place-items-center rounded-full border-2 border-background bg-primary shadow-md">
              <span className="size-1.5 rounded-full bg-primary-foreground" />
            </span>
          </div>
        </div>

        {/* cluster pins */}
        {projected.map((p, i) => (
          <button
            key={p.item.id}
            onClick={() => onSelect(p.item)}
            className="group absolute -translate-x-1/2 -translate-y-full focus:outline-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <motion.div
              initial={{ scale: 0, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 360, damping: 22 }}
              className="relative grid place-items-center rounded-full border-2 border-background bg-accent px-2 py-1 text-xs font-bold text-accent-foreground shadow-lift transition group-hover:scale-110"
            >
              <MapPin className="absolute -bottom-1 size-3 fill-accent text-accent" />
              {p.count}
            </motion.div>
            <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-44 -translate-x-1/2 rounded-xl border border-border bg-card p-2 opacity-0 shadow-lift transition group-hover:opacity-100">
              <p className="truncate text-xs font-semibold text-foreground">
                {p.item.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {p.item.owner?.name} · {fuzzyDistance(p.item.distanceMiles ?? 1)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-background bg-primary" />
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            #
          </span>
          Items at this shelf (click to view)
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-accent" />
          Pins are jittered — exact addresses are never shown.
        </span>
      </div>
    </div>
  );
}

function EmptyDiscover({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-muted">
        <Compass className="size-7 text-muted-foreground/70" />
      </div>
      <p className="font-display text-lg font-semibold text-foreground">
        No shelves in range yet
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Try widening your radius or clearing your filters. You can also seed
        some demo neighbors from the dashboard.
      </p>
      <Button className="mt-4" variant="outline" onClick={onExpand}>
        <SlidersHorizontal className="size-4" />
        Widen to 5 miles & clear filters
      </Button>
    </div>
  );
}

function hashAngle(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 628) / 100;
}
