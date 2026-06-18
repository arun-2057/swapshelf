"use client";

import { cn } from "@/lib/utils";
import { BookOpen, Dices } from "lucide-react";

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const icon =
    size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid place-items-center rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-soft",
          dims
        )}
      >
        <BookOpen className={cn(icon, "rotate-[-8deg]")} strokeWidth={2.2} />
        <Dices
          className={cn(
            "absolute -bottom-1 -right-1 rounded-md bg-accent p-0.5 text-accent-foreground shadow"
          )}
          strokeWidth={2.4}
        />
      </div>
      <div className="leading-none">
        <span className="font-display text-xl font-bold tracking-tight text-foreground">
          Swap<span className="text-primary">Shelf</span>
        </span>
      </div>
    </div>
  );
}
