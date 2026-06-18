"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-accent/15 text-accent",
  "bg-amber-600/15 text-amber-700 dark:text-amber-400",
  "bg-teal-600/15 text-teal-700 dark:text-teal-400",
  "bg-rose-600/15 text-rose-700 dark:text-rose-400",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  className,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const dims =
    size === "xs"
      ? "size-6 text-[10px]"
      : size === "sm"
        ? "size-8 text-xs"
        : size === "lg"
          ? "size-12 text-base"
          : size === "xl"
            ? "size-20 text-2xl"
            : "size-10 text-sm";
  const colorIdx =
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
    avatarColors.length;
  return (
    <Avatar className={cn(dims, className)}>
      <AvatarImage src={avatarUrl || undefined} alt={name} />
      <AvatarFallback className={cn("font-semibold", avatarColors[colorIdx])}>
        {initials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
