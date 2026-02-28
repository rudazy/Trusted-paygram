"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  variant?: "default" | "primary" | "warning" | "danger";
  onClick?: () => void;
}

const glowMap = {
  default: "",
  primary: "glow-green",
  warning: "glow-yellow",
  danger: "glow-red",
};

export default function GlassCard({
  children,
  className,
  hover = true,
  variant = "default",
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        hover ? "glass-card" : "glass-card-static",
        glowMap[variant],
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
