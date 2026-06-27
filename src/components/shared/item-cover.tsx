"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { BookOpen, Dices } from "lucide-react";
import type { ItemType } from "@/lib/types";

// Deterministic warm gradient based on title — gives every item a
// unique "spine" even when no cover image exists. Also serves as the
// LQIP (Low-Quality Image Placeholder) background while next/image
// loads the high-res cover, preventing CLS.
const palettes: { from: string; to: string; ink: string }[] = [
  { from: "#2d4a3e", to: "#4a6b5a", ink: "#f5e6c8" },
  { from: "#7a4a2d", to: "#a0683f", ink: "#f5e6c8" },
  { from: "#4a3a6b", to: "#6b5a8a", ink: "#f5e6c8" },
  { from: "#6b3a3a", to: "#8a5454", ink: "#f5e6c8" },
  { from: "#3a5a6b", to: "#54768a", ink: "#f5e6c8" },
  { from: "#6b5a2d", to: "#8a7740", ink: "#f5e6c8" },
  { from: "#2d4a4a", to: "#4a6868", ink: "#f5e6c8" },
  { from: "#5a2d4a", to: "#7a4a64", ink: "#f5e6c8" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ItemCover({
  title,
  creator,
  type,
  imageUrl,
  className,
}: {
  title: string;
  creator?: string | null;
  type: ItemType;
  imageUrl?: string | null;
  className?: string;
}) {
  const palette = palettes[hashString(title || "") % palettes.length];

  // Gradient spine style — used as the container background so it
  // shows instantly (LQIP) while the image loads on top.
  const gradientStyle = {
    background: `linear-gradient(150deg, ${palette.from}, ${palette.to})`,
    color: palette.ink,
  };

  if (imageUrl) {
    // Determine if this is a data URL (evidence photo) or external URL.
    // next/image handles both, but data URLs need unoptimized=true.
    const isDataUrl = imageUrl.startsWith("data:");

    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg",
          className
        )}
        style={gradientStyle}
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 200px"
          className="object-cover"
          unoptimized={isDataUrl}
          onError={(e) => {
            // Hide the image on error — the gradient spine shows through
            (e.currentTarget as HTMLImageElement).style.opacity = "0";
          }}
        />
      </div>
    );
  }

  // No cover image — render the gradient spine with title text
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-lg p-3 shadow-inner",
        className
      )}
      style={gradientStyle}
    >
      {/* spine */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-black/20" />
      <div className="absolute left-1.5 top-0 h-full w-px bg-white/10" />
      <div className="flex items-start justify-between">
        {type === "BOOK" ? (
          <BookOpen className="size-4 opacity-70" />
        ) : (
          <Dices className="size-4 opacity-70" />
        )}
      </div>
      <div className="space-y-1">
        <p className="line-clamp-3 font-display text-sm font-bold leading-tight drop-shadow-sm">
          {title}
        </p>
        {creator && (
          <p className="line-clamp-1 text-[10px] uppercase tracking-wider opacity-70">
            {creator}
          </p>
        )}
      </div>
    </div>
  );
}
