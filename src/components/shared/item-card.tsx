"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/types";
import { ItemCover } from "@/components/shared/item-cover";
import {
  TypePill,
  ConditionBadge,
  ItemStatusBadge,
} from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { fuzzyDistance } from "@/lib/geo";
import { MapPin } from "lucide-react";

export function ItemCard({
  item,
  onClick,
  footer,
  className,
  showOwner = true,
}: {
  item: Item;
  onClick?: () => void;
  footer?: React.ReactNode;
  className?: string;
  showOwner?: boolean;
}) {
  const interactive = !!onClick;
  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft transition hover:border-primary/30 hover:shadow-lift",
        interactive && "cursor-pointer",
        className
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <ItemCover
          title={item.title}
          creator={item.creator}
          type={item.type}
          imageUrl={item.imageUrl}
          className="h-full w-full rounded-none transition group-hover:scale-[1.03]"
        />
        <div className="absolute left-2 top-2 flex gap-1.5">
          <TypePill type={item.type} className="backdrop-blur" />
        </div>
        {item.status !== "AVAILABLE" && (
          <div className="absolute right-2 top-2">
            <ItemStatusBadge status={item.status} className="backdrop-blur" />
          </div>
        )}
        {typeof item.distanceMiles === "number" && (
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
            <MapPin className="size-3 text-accent" />
            {fuzzyDistance(item.distanceMiles)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground">
          {item.title}
        </h3>
        {item.creator && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {item.creator}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <ConditionBadge condition={item.condition} />
          {showOwner && item.owner && (
            <div className="flex items-center gap-1.5">
              <UserAvatar
                name={item.owner.name}
                avatarUrl={item.owner.avatarUrl}
                size="xs"
              />
              <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                {item.owner.neighborhood || item.owner.name}
              </span>
            </div>
          )}
        </div>
        {footer}
      </div>
    </motion.div>
  );
}
