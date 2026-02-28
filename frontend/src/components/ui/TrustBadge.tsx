"use client";

import { ShieldCheck, Clock, Lock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TrustTier = "high" | "medium" | "low" | "unscored";

interface TrustBadgeProps {
  tier: TrustTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const config = {
  high: {
    label: "High Trust",
    Icon: ShieldCheck,
    bg: "bg-primary-muted",
    border: "border-primary/20",
    text: "text-primary",
    dot: "bg-primary",
  },
  medium: {
    label: "Medium Trust",
    Icon: Clock,
    bg: "bg-warning-muted",
    border: "border-warning/20",
    text: "text-warning",
    dot: "bg-warning",
  },
  low: {
    label: "Low Trust",
    Icon: Lock,
    bg: "bg-danger-muted",
    border: "border-danger/20",
    text: "text-danger",
    dot: "bg-danger",
  },
  unscored: {
    label: "Unscored",
    Icon: HelpCircle,
    bg: "bg-white/5",
    border: "border-white/10",
    text: "text-text-muted",
    dot: "bg-text-muted",
  },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
};

const iconSizes = { sm: 12, md: 14, lg: 16 };

export default function TrustBadge({
  tier,
  size = "md",
  className,
}: TrustBadgeProps) {
  const c = config[tier];
  const Icon = c.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        c.bg,
        c.border,
        c.text,
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} />
      <span>{c.label}</span>
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            c.dot
          )}
        />
        <span
          className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", c.dot)}
        />
      </span>
    </span>
  );
}
