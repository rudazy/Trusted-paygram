"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "warning" | "danger" | "outline";
  size?: "sm" | "md";
  className?: string;
}

const variantClasses = {
  default: "bg-white/5 text-text-secondary border-white/10",
  primary: "bg-primary-muted text-primary border-primary/20",
  secondary: "bg-secondary-muted text-secondary border-secondary/20",
  warning: "bg-warning-muted text-warning border-warning/20",
  danger: "bg-danger-muted text-danger border-danger/20",
  outline: "bg-transparent text-text-secondary border-white/10",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}
