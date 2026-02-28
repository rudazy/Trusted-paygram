"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressDisplayProps {
  address: string;
  full?: boolean;
  className?: string;
}

function truncate(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AddressDisplay({
  address,
  full = false,
  className,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm text-text-secondary",
        "hover:text-text transition-colors group",
        className
      )}
      title="Click to copy address"
    >
      <span>{full ? address : truncate(address)}</span>
      {copied ? (
        <Check size={13} className="text-primary" />
      ) : (
        <Copy
          size={13}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </button>
  );
}
