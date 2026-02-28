"use client";

import { useState } from "react";
import { Info, AlertTriangle, X, ArrowRightLeft } from "lucide-react";
import { useWeb3 } from "@/providers/Web3Provider";
import { cn } from "@/lib/utils";

export default function NetworkBanner() {
  const { isConnected, isSupportedChain, switchToSepolia } = useWeb3();
  const [dismissed, setDismissed] = useState(false);

  // Connected on correct network — no banner
  if (isConnected && isSupportedChain) return null;

  // Dismissed by user
  if (dismissed) return null;

  const isWrongNetwork = isConnected && !isSupportedChain;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 mb-6",
        "bg-surface/60 backdrop-blur-xl border border-white/[0.06]",
        isWrongNetwork
          ? "border-l-warning"
          : "border-l-secondary"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
          isWrongNetwork
            ? "bg-warning/10 text-warning"
            : "bg-secondary/10 text-secondary"
        )}
      >
        {isWrongNetwork ? (
          <AlertTriangle size={16} />
        ) : (
          <Info size={16} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            isWrongNetwork ? "text-warning" : "text-text-secondary"
          )}
        >
          {isWrongNetwork
            ? "You\u2019re on the wrong network"
            : "Connect your wallet to interact with contracts"}
        </p>
        {isWrongNetwork && (
          <p className="text-xs text-text-muted mt-0.5">
            PayGram operates on Sepolia testnet
          </p>
        )}
      </div>

      {/* Action button */}
      {isWrongNetwork && (
        <button
          type="button"
          onClick={switchToSepolia}
          className={cn(
            "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
            "bg-warning/10 text-warning hover:bg-warning/20",
            "transition-colors duration-200"
          )}
        >
          <ArrowRightLeft size={12} />
          Switch to Sepolia
        </button>
      )}

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-md text-text-muted hover:text-text hover:bg-white/[0.05] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
