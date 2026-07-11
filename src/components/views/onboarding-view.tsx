"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/store/app-store";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Crosshair,
  ArrowRight,
  Shield,
  Search,
  Navigation,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { presetNeighborhoods, CUSTOM_COORDS_NAME, type Preset } from "@/lib/geo";

export function OnboardingView() {
  const { user, setLocation, setView } = useApp();
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [zip, setZip] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [query, setQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customLat, setCustomLat] = useState("");
  const [customLon, setCustomLon] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return presetNeighborhoods;
    const q = query.toLowerCase();
    return presetNeighborhoods.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Preset[]>();
    for (const p of filtered) {
      if (!map.has(p.region)) map.set(p.region, []);
      map.get(p.region)!.push(p);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function pickPreset(p: Preset) {
    setCustomMode(false);
    setLat(p.lat);
    setLon(p.lon);
    setZip(p.zip);
    setNeighborhood(`${p.name}, ${p.city}`);
    toast.success(`Home base set to ${p.name}, ${p.city}`);
  }

  function pickCustom() {
    setCustomMode(true);
    setLat(null);
    setLon(null);
    setNeighborhood("");
  }

  function applyCustom() {
    const parsedLat = parseFloat(customLat);
    const parsedLon = parseFloat(customLon);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
      toast.error("Please enter valid coordinates.");
      return;
    }
    if (parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      toast.error("Latitude must be -90..90, longitude must be -180..180.");
      return;
    }
    setLat(parsedLat);
    setLon(parsedLon);
    setNeighborhood(customNeighborhood || `Custom (${parsedLat.toFixed(4)}, ${parsedLon.toFixed(4)})`);
    toast.success("Custom coordinates set.");
  }

  const customNeighborhood = neighborhood.startsWith("Custom")
    ? ""
    : neighborhood;

  function useMyLocation() {
    setDetecting(true);
    setCustomMode(false);
    if (!("geolocation" in navigator)) {
      setTimeout(() => {
        setLat(null);
        setLon(null);
        setNeighborhood("");
        setDetecting(false);
        toast.info("Geolocation unavailable — please pick a neighborhood below.");
      }, 700);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setNeighborhood("Detected area");
        setDetecting(false);
        toast.success("Home base detected from your device.");
      },
      () => {
        setLat(null);
        setLon(null);
        setNeighborhood("");
        setDetecting(false);
        toast.info("Couldn't access GPS — please pick a neighborhood below.");
      },
      { timeout: 5000 }
    );
  }

  async function handleFinish() {
    if (lat === null || lon === null) {
      toast.error("Please pick a home base first.");
      return;
    }
    setBusy(true);
    try {
      await setLocation(lat, lon, zip || undefined, neighborhood || undefined);
      toast.success("Home base saved. Welcome to your shelf!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background paper-texture">
      <header className="border-b border-border/60 glass-strong">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => setView("landing")}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <Globe className="size-6" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Set your home base
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
              Pick anywhere on the globe. Your exact address is{" "}
              <span className="font-semibold text-foreground">never shared</span>{" "}
              — neighbors only see a fuzzy distance like "0.4 miles away."
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7">
            <button
              onClick={useMyLocation}
              disabled={detecting}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-left transition hover:bg-primary/10 disabled:opacity-60"
            >
              <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                {detecting ? (
                  <Crosshair className="size-5 animate-pulse" />
                ) : (
                  <Navigation className="size-5" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {detecting ? "Detecting your location…" : "Use my current location"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fastest — uses your device GPS
                </p>
              </div>
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                or pick anywhere
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a city or neighborhood…"
                className="pl-9"
              />
            </div>

            {/* Custom coordinates */}
            <button
              type="button"
              onClick={pickCustom}
              className={`mb-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                customMode
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <div
                className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                  customMode
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  Enter custom coordinates
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Type latitude &amp; longitude directly
                </p>
              </div>
            </button>

            {customMode && (
              <div className="mb-4 grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-lat" className="text-xs">Latitude</Label>
                  <Input
                    id="custom-lat"
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="e.g. 51.505"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-lon" className="text-xs">Longitude</Label>
                  <Input
                    id="custom-lon"
                    type="number"
                    step="any"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    placeholder="e.g. -0.09"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyCustom}
                    className="w-full sm:w-auto"
                  >
                    Apply coordinates
                  </Button>
                </div>
              </div>
            )}

            {/* Scrollable grouped list */}
            <div className="max-h-72 space-y-4 overflow-y-auto scroll-fancy pr-1">
              {grouped.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No locations match "{query}"
                </p>
              )}
              {grouped.map(([region, items]) => (
                <div key={region}>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {region}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((p) => {
                      const active = neighborhood === `${p.name}, ${p.city}`;
                      return (
                        <button
                          key={`${p.name}-${p.city}`}
                          onClick={() => pickPreset(p)}
                          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                            active
                              ? "border-accent bg-accent/10"
                              : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                          }`}
                        >
                          <div
                            className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                              active
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <MapPin className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {p.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.city} · {p.zip}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zip" className="flex items-center gap-1.5">
                  <Search className="size-3.5" /> ZIP / postal code (optional)
                </Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="10010"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nb">Neighborhood label</Label>
                <Input
                  id="nb"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Maple Heights, New York"
                />
              </div>
            </div>

            {lat !== null && lon !== null && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/8 px-3 py-2 text-xs text-primary">
                <Shield className="size-3.5" />
                Coordinates locked ({lat.toFixed(4)}, {lon.toFixed(4)}). Only fuzzy distance will be shared.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
            <Button
              onClick={handleFinish}
              disabled={busy || lat === null}
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {busy ? "Saving…" : "Enter SwapShelf"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
