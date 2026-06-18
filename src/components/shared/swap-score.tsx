"use client";

import { cn } from "@/lib/utils";
import { Star, Trophy, Sparkles } from "lucide-react";

/**
 * SwapScore — gamified trust score 0-100.
 * Renders as a ring + tier label.
 */
export function SwapScoreRing({
  score,
  size = 64,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;

  const tier =
    clamped >= 85
      ? { label: "Caretaker", color: "#2d4a3e" }
      : clamped >= 65
        ? { label: "Trusted", color: "#3a6b4f" }
        : clamped >= 40
          ? { label: "Friendly", color: "#c98a3a" }
          : { label: "Newcomer", color: "#b08068" };

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tier.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="font-display text-lg font-bold" style={{ color: tier.color }}>
          {clamped}
        </span>
      </div>
    </div>
  );
}

export function SwapScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const tier =
    score >= 85
      ? { label: "Caretaker", Icon: Trophy, color: "text-primary" }
      : score >= 65
        ? { label: "Trusted", Icon: Sparkles, color: "text-teal-600 dark:text-teal-400" }
        : score >= 40
          ? { label: "Friendly", Icon: Star, color: "text-amber-600 dark:text-amber-400" }
          : { label: "Newcomer", Icon: Star, color: "text-muted-foreground" };
  const { Icon } = tier;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      <Icon className={cn("size-3.5", tier.color)} />
      <span className={tier.color}>{score}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{tier.label}</span>
    </span>
  );
}
