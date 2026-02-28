"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  accentColor?: "primary" | "secondary" | "warning" | "danger";
  className?: string;
}

const accentMap = {
  primary: {
    bg: "bg-primary-muted",
    text: "text-primary",
    border: "border-l-primary",
  },
  secondary: {
    bg: "bg-secondary-muted",
    text: "text-secondary",
    border: "border-l-secondary",
  },
  warning: {
    bg: "bg-warning-muted",
    text: "text-warning",
    border: "border-l-warning",
  },
  danger: {
    bg: "bg-danger-muted",
    text: "text-danger",
    border: "border-l-danger",
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = "primary",
  className,
}: StatCardProps) {
  const accent = accentMap[accentColor];

  return (
    <div
      className={cn(
        "glass-card-static p-5 border-l-2",
        accent.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {title}
          </p>
          <p className="text-2xl font-heading font-bold text-text">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl", accent.bg)}>
          <Icon size={20} className={accent.text} />
        </div>
      </div>
    </div>
  );
}
