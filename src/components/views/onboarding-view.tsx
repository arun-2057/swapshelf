"use client";

import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

// A small set of "neighborhoods" the user can pick to simulate the
// map picker without a real maps API. Each has approximate coords.
const presetNeighborhoods = [
  { name: "Maple Heights", lat: 40.735, lon: -73.99, zip: "10010" },
  { name: "Riverside", lat: 40.721, lon: -74.002, zip: "10014" },
  { name: "Old Town", lat: 40.724, lon: -73.985, zip: "10003" },
  { name: "Cedar Park", lat: 40.73, lon: -73.979, zip: "10016" },
  { name: "Greenfield", lat: 40.719, lon: -73.99, zip: "10002" },
];

export function OnboardingView() {
  const { user, setLocation, setView } = useApp();
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [zip, setZip] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);

  function pickPreset(p: (typeof presetNeighborhoods)[number]) {
    setLat(p.lat);
    setLon(p.lon);
    setZip(p.zip);
    setNeighborhood(p.name);
    toast.success(`Home base set to ${p.name}`);
  }

  function useMyLocation() {
    setDetecting(true);
    if (!("geolocation" in navigator)) {
      // Fallback: simulate a detected location near NYC
      setTimeout(() => {
        setLat(40.7282);
        setLon(-73.9942);
        setNeighborhood("Maple Heights");
        setZip("10010");
        setDetecting(false);
        toast.success("Home base detected (simulated).");
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
        // Fallback
        setLat(40.7282);
        setLon(-73.9942);
        setNeighborhood("Maple Heights");
        setZip("10010");
        setDetecting(false);
        toast.info("Couldn't access GPS — set a fallback location.");
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
              <MapPin className="size-6" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Set your home base
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
              We use this to find shelves near you. Your exact address is{" "}
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
                or pick a neighborhood
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {presetNeighborhoods.map((p) => {
                const active = neighborhood === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => pickPreset(p)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-accent bg-accent/10"
                        : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <div
                      className={`grid size-9 place-items-center rounded-lg ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <MapPin className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.zip} · simulated block
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zip" className="flex items-center gap-1.5">
                  <Search className="size-3.5" /> ZIP code (optional)
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
                  placeholder="Maple Heights"
                />
              </div>
            </div>

            {lat !== null && lon !== null && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/8 px-3 py-2 text-xs text-primary">
                <Shield className="size-3.5" />
                Coordinates locked. Only fuzzy distance will be shared.
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
