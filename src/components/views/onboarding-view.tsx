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

// Global neighborhood presets — spanning six continents so users
// anywhere can find a plausible home base.
interface Preset {
  name: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  zip: string;
}

const presetNeighborhoods: Preset[] = [
  // North America
  { name: "Maple Heights", city: "New York", region: "North America", lat: 40.735, lon: -73.99, zip: "10010" },
  { name: "Williamsburg", city: "New York", region: "North America", lat: 40.7142, lon: -73.9614, zip: "11211" },
  { name: "Mission District", city: "San Francisco", region: "North America", lat: 37.7599, lon: -122.4148, zip: "94110" },
  { name: "Capitol Hill", city: "Seattle", region: "North America", lat: 47.6251, lon: -122.3217, zip: "98102" },
  { name: "Wicker Park", city: "Chicago", region: "North America", lat: 41.9088, lon: -87.6796, zip: "60622" },
  { name: "Plateau", city: "Montréal", region: "North America", lat: 45.5247, lon: -73.575, zip: "H2T" },
  { name: "Roma Norte", city: "Mexico City", region: "North America", lat: 19.4174, lon: -99.1634, zip: "06700" },

  // South America
  { name: "Vila Madalena", city: "São Paulo", region: "South America", lat: -23.5542, lon: -46.6905, zip: "05435" },
  { name: "Palermo", city: "Buenos Aires", region: "South America", lat: -34.5889, lon: -58.4314, zip: "1414" },
  { name: "Belén", city: "Lima", region: "South America", lat: -12.0464, lon: -77.0428, zip: "15086" },
  { name: "La Candelaria", city: "Bogotá", region: "South America", lat: 4.572, lon: -74.073, zip: "110321" },

  // Europe
  { name: "Hackney", city: "London", region: "Europe", lat: 51.545, lon: -0.0556, zip: "E8" },
  { name: "Le Marais", city: "Paris", region: "Europe", lat: 48.8566, lon: 2.3614, zip: "75004" },
  { name: "Kreuzberg", city: "Berlin", region: "Europe", lat: 52.4995, lon: 13.425, zip: "10999" },
  { name: "Trastevere", city: "Rome", region: "Europe", lat: 41.8896, lon: 12.4695, zip: "00153" },
  { name: "De Pijp", city: "Amsterdam", region: "Europe", lat: 52.3535, lon: 4.8917, zip: "1073" },
  { name: "Gràcia", city: "Barcelona", region: "Europe", lat: 41.4022, lon: 2.1564, zip: "08012" },
  { name: "Södermalm", city: "Stockholm", region: "Europe", lat: 59.313, lon: 18.073, zip: "11620" },
  { name: "Príncipe Real", city: "Lisbon", region: "Europe", lat: 38.7143, lon: -9.1485, zip: "1250" },

  // Asia
  { name: "Shimokitazawa", city: "Tokyo", region: "Asia", lat: 35.661, lon: 139.6692, zip: "155-0031" },
  { name: "Hongdae", city: "Seoul", region: "Asia", lat: 37.556, lon: 126.9236, zip: "04000" },
  { name: "Bandra West", city: "Mumbai", region: "Asia", lat: 19.0596, lon: 72.8295, zip: "400050" },
  { name: "Ximending", city: "Taipei", region: "Asia", lat: 25.0424, lon: 121.5085, zip: "108" },
  { name: "Tiong Bahru", city: "Singapore", region: "Asia", lat: 1.2847, lon: 103.8408, zip: "168981" },
  { name: "Cihangir", city: "Istanbul", region: "Asia", lat: 41.0357, lon: 28.9851, zip: "34421" },
  { name: "Thảo Điền", city: "Ho Chi Minh City", region: "Asia", lat: 10.8058, lon: 106.7341, zip: "700000" },
  { name: "Xintiandi", city: "Shanghai", region: "Asia", lat: 31.2237, lon: 121.4692, zip: "200021" },
  { name: "Hauz Khas", city: "New Delhi", region: "Asia", lat: 28.5494, lon: 77.2001, zip: "110016" },

  // Africa
  { name: "Bo-Kaap", city: "Cape Town", region: "Africa", lat: -33.9245, lon: 18.4108, zip: "8001" },
  { name: "Maadi", city: "Cairo", region: "Africa", lat: 29.9602, lon: 31.2569, zip: "11728" },
  { name: "Yoff", city: "Dakar", region: "Africa", lat: 14.7472, lon: -17.2422, zip: "9935" },
  { name: "Westlands", city: "Nairobi", region: "Africa", lat: -1.2676, lon: 36.8108, zip: "00100" },

  // Oceania
  { name: "Newtown", city: "Sydney", region: "Oceania", lat: -33.8968, lon: 151.1796, zip: "2042" },
  { name: "Fitzroy", city: "Melbourne", region: "Oceania", lat: -37.7971, lon: 144.9793, zip: "3065" },
  { name: "Ponsonby", city: "Auckland", region: "Oceania", lat: -36.8536, lon: 174.746, zip: "1011" },
];

export function OnboardingView() {
  const { user, setLocation, setView } = useApp();
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [zip, setZip] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [query, setQuery] = useState("");

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
    setLat(p.lat);
    setLon(p.lon);
    setZip(p.zip);
    setNeighborhood(`${p.name}, ${p.city}`);
    toast.success(`Home base set to ${p.name}, ${p.city}`);
  }

  function useMyLocation() {
    setDetecting(true);
    if (!("geolocation" in navigator)) {
      setTimeout(() => {
        setLat(40.7282);
        setLon(-73.9942);
        setNeighborhood("Detected area");
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
        setLat(40.7282);
        setLon(-73.9942);
        setNeighborhood("Maple Heights, New York");
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
