"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/store/app-store";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScanLine,
  Keyboard,
  Search,
  Loader2,
  Check,
  BookOpen,
  Dices,
  Camera,
  Sparkles,
  X,
} from "lucide-react";
import { ItemCover } from "@/components/shared/item-cover";
import type { ItemType, ItemCondition } from "@/lib/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Sample barcodes users can try quickly (these will resolve via Open Library
// if real, otherwise fall back to our curated lookup).
const sampleBarcodes = [
  { code: "9780547928227", type: "BOOK" as const, label: "The Hobbit" },
  { code: "9780439708180", type: "BOOK" as const, label: "Harry Potter #1" },
  { code: "9780307277671", type: "BOOK" as const, label: "The Road" },
];

const conditions: { value: ItemCondition; label: string }[] = [
  { value: "NEW", label: "Brand new" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good — light wear" },
  { value: "FAIR", label: "Fair — well read" },
  { value: "WORN", label: "Well-loved" },
];

export function AddItemDialog() {
  const { add_item_open, setAddItemOpen, refreshMyItems } = useApp();
  const [tab, setTab] = useState<"scan" | "manual">("scan");

  return (
    <Dialog open={add_item_open} onOpenChange={setAddItemOpen}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border bg-secondary/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="size-5 text-accent" />
            Add to your shelf
          </DialogTitle>
          <DialogDescription>
            Scan a barcode to auto-fill details, or enter them by hand.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="scan"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2 py-3"
            >
              <ScanLine className="size-4" />
              Barcode scan
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2 py-3"
            >
              <Keyboard className="size-4" />
              Manual entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="m-0 p-0">
            <ScanTab />
          </TabsContent>
          <TabsContent value="manual" className="m-0 p-0">
            <ManualTab
              onClose={() => {
                setAddItemOpen(false);
                void refreshMyItems();
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ScanTab() {
  const { setAddItemOpen, refreshMyItems } = useApp();
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<ItemType>("BOOK");
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    title: string;
    creator?: string;
    imageUrl?: string;
    code: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const scanLineRef = useRef<HTMLDivElement>(null);

  // Simulated scan animation
  useEffect(() => {
    if (!scanning) return;
    const t = setTimeout(() => {
      setScanning(false);
      // auto-pick a sample for the demo
      const pick = sampleBarcodes[Math.floor(Math.random() * sampleBarcodes.length)];
      setType(pick.type);
      setCode(pick.code);
      void lookup(pick.code, pick.type);
    }, 2200);
    return () => clearTimeout(t);
  }, [scanning]);

  async function lookup(c: string, t: ItemType) {
    if (!c.trim()) {
      toast.error("Enter a barcode first");
      return;
    }
    setLooking(true);
    setResult(null);
    try {
      const res = await api.lookupBarcode(c.trim(), t);
      setResult({ ...res, code: c.trim() });
      if (!res.found) {
        toast.info("No match found — switch to Manual entry to finish.");
      } else {
        toast.success("Found it!");
      }
    } catch {
      toast.error("Lookup failed");
    } finally {
      setLooking(false);
    }
  }

  async function save() {
    if (!result?.found) return;
    setSaving(true);
    try {
      await api.createItem({
        title: result.title,
        type,
        creator: result.creator,
        imageUrl: result.imageUrl,
        isbn: result.code,
        condition: "GOOD",
      });
      toast.success(`"${result.title}" added to your shelf`);
      setAddItemOpen(false);
      void refreshMyItems();
      setResult(null);
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      {/* Scanner viewport */}
      <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/10 to-accent/5">
        {scanning ? (
          <>
            <div className="absolute inset-0 grid place-items-center">
              <Camera className="size-10 text-primary/40" />
            </div>
            <motion.div
              ref={scanLineRef}
              className="absolute left-0 right-0 h-0.5 bg-accent shadow-[0_0_12px_2px] shadow-accent"
              animate={{ top: ["8%", "92%", "8%"] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
              Scanning…
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary">
              <ScanLine className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Point your camera at a barcode
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We'll look up the title, author & cover automatically.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setScanning(true)}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Camera className="size-4" />
              Start scan
            </Button>
          </div>
        )}
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setType("BOOK")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
            type === "BOOK"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <BookOpen className="size-4" /> Book (ISBN)
        </button>
        <button
          onClick={() => setType("BOARD_GAME")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
            type === "BOARD_GAME"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Dices className="size-4" /> Board game (UPC)
        </button>
      </div>

      {/* Manual code entry + lookup */}
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={type === "BOOK" ? "9780547928227" : "029877030417"}
          onKeyDown={(e) => e.key === "Enter" && lookup(code, type)}
        />
        <Button
          onClick={() => lookup(code, type)}
          disabled={looking || !code.trim()}
          variant="outline"
        >
          {looking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Look up
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground">Try:</span>
        {sampleBarcodes.map((s) => (
          <button
            key={s.code}
            onClick={() => {
              setType(s.type);
              setCode(s.code);
              void lookup(s.code, s.type);
            }}
            className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Result preview */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <ItemCover
                title={result.title || "Unknown"}
                creator={result.creator}
                type={type}
                imageUrl={result.imageUrl}
                className="aspect-[2/3] w-16 shrink-0"
              />
              <div className="min-w-0 flex-1">
                {result.found ? (
                  <>
                    <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Check className="size-3" /> Match found
                    </div>
                    <p className="font-display font-semibold leading-tight text-foreground">
                      {result.title}
                    </p>
                    {result.creator && (
                      <p className="text-sm text-muted-foreground">
                        {result.creator}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Add to my shelf
                    </Button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <X className="mb-1 size-5 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      No match in the catalog
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Switch to Manual entry to add it yourself.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ManualTab({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<ItemType>("BOOK");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [isbn, setIsbn] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("GOOD");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await api.createItem({
        title: title.trim(),
        type,
        creator: creator.trim() || undefined,
        isbn: isbn.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        condition,
        description: description.trim() || undefined,
      });
      toast.success(`"${title}" added to your shelf`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-2">
        <button
          onClick={() => setType("BOOK")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
            type === "BOOK"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <BookOpen className="size-4" /> Book
        </button>
        <button
          onClick={() => setType("BOARD_GAME")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
            type === "BOARD_GAME"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Dices className="size-4" /> Board game
        </button>
      </div>

      <div className="flex gap-4">
        <div className="w-20 shrink-0">
          <ItemCover
            title={title || "Preview"}
            creator={creator}
            type={type}
            imageUrl={imageUrl}
            className="aspect-[2/3] w-full"
          />
        </div>
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">
              Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "BOOK" ? "The Name of the Wind" : "Wingspan"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="creator" className="text-xs">
              {type === "BOOK" ? "Author" : "Designer / Publisher"}
            </Label>
            <Input
              id="creator"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder={type === "BOOK" ? "Patrick Rothfuss" : "Stonemaier Games"}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="isbn" className="text-xs">
            {type === "BOOK" ? "ISBN" : "UPC"} (optional)
          </Label>
          <Input
            id="isbn"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="9780547928227"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Condition</Label>
          <Select value={condition} onValueChange={(v) => setCondition(v as ItemCondition)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conditions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="img" className="text-xs">
          Cover image URL (optional)
        </Label>
        <Input
          id="img"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="desc" className="text-xs">
          Notes for borrowers (optional)
        </Label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Spine slightly creased, otherwise great shape. Comes with the original bookmark."
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Add to shelf
        </Button>
      </div>
    </div>
  );
}
