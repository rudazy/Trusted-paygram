"use client";

import { useState, useRef, useEffect } from "react";
import {
  Wallet,
  ChevronDown,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  ArrowRightLeft,
  Globe,
} from "lucide-react";
import { useWeb3 } from "@/providers/Web3Provider";
import { cn } from "@/lib/utils";

function truncateAddr(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getNetworkColor(chainId: number | null, isSepolia: boolean, isSupportedChain: boolean) {
  if (!chainId) return "bg-text-muted";
  if (isSepolia) return "bg-primary";        // green for Sepolia
  if (isSupportedChain) return "bg-secondary"; // blue for Mainnet
  return "bg-danger";                          // red for unsupported
}

function getExplorerUrl(chainId: number | null, address: string) {
  if (chainId === 1) return `https://etherscan.io/address/${address}`;
  return `https://sepolia.etherscan.io/address/${address}`;
}

export default function ConnectButton() {
  const {
    address,
    chainId,
    chainName,
    hasWallet,
    isConnected,
    isLoading,
    isSupportedChain,
    isSepolia,
    connect,
    disconnect,
    switchToSepolia,
  } = useWeb3();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── State 1: Actively connecting (only during real connection attempt) ───
  if (isLoading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.03] border border-white/[0.06] text-text-muted"
      >
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Connecting...
      </button>
    );
  }

  // ─── State 2: Not connected — show Connect Wallet button ───
  if (!isConnected || !address) {
    return (
      <button
        type="button"
        onClick={connect}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",
          "bg-primary text-black hover:bg-primary-hover active:scale-[0.98]",
          "transition-all duration-200 shadow-lg shadow-primary/20"
        )}
      >
        <Wallet size={16} />
        {hasWallet ? "Connect Wallet" : "Install MetaMask"}
      </button>
    );
  }

  // ─── State 3: Connected but wrong network — show amber warning ───
  if (!isSupportedChain) {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
            "bg-warning/10 border border-warning/20",
            "hover:border-warning/40 transition-all duration-200"
          )}
        >
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
          </span>
          <span className="font-medium text-warning">Wrong Network</span>
          <ChevronDown
            size={14}
            className={cn(
              "text-warning/60 transition-transform duration-200",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 animate-slide-down z-50 bg-surface border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden">
            {/* Address header */}
            <div className="p-3 border-b border-white/[0.06]">
              <p className="text-xs text-text-muted mb-1">Connected Wallet</p>
              <p className="text-xs font-mono text-text-secondary break-all">
                {address}
              </p>
            </div>

            {/* Network info */}
            <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
              <Globe size={12} className="text-text-muted" />
              <span className="text-xs text-text-muted">Network:</span>
              <span className="text-xs font-medium text-danger flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
                {chainName}
              </span>
            </div>

            <div className="p-1">
              {/* Switch to Sepolia */}
              <button
                type="button"
                onClick={() => {
                  switchToSepolia();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-warning hover:bg-warning/10 rounded-lg transition-colors font-medium"
              >
                <ArrowRightLeft size={14} />
                Switch to Sepolia
              </button>

              {/* Copy */}
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-white/[0.03] rounded-lg transition-colors"
              >
                {copied ? (
                  <Check size={14} className="text-primary" />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? "Copied!" : "Copy Address"}
              </button>

              {/* Disconnect */}
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger-muted rounded-lg transition-colors"
              >
                <LogOut size={14} />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── State 4: Connected on correct network — show green dot + address ───
  const networkColor = getNetworkColor(chainId, isSepolia, isSupportedChain);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
          "bg-white/[0.03] border border-white/[0.06]",
          "hover:border-white/[0.12] transition-all duration-200"
        )}
      >
        <span className={cn("relative inline-flex h-2 w-2", networkColor)}>
          <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", networkColor)} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", networkColor)} />
        </span>
        <span className="font-mono text-text">{truncateAddr(address)}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
          {chainName}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-text-muted transition-transform duration-200",
            dropdownOpen && "rotate-180"
          )}
        />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 animate-slide-down z-50 bg-surface border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden">
          {/* Address header */}
          <div className="p-3 border-b border-white/[0.06]">
            <p className="text-xs text-text-muted mb-1">Connected Wallet</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-text-secondary break-all flex-1">
                {address}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex-shrink-0 p-1 rounded text-text-muted hover:text-primary transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check size={12} className="text-primary" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          </div>

          {/* Network info */}
          <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
            <Globe size={12} className="text-text-muted" />
            <span className="text-xs text-text-muted">Network:</span>
            <span className="text-xs font-medium text-primary flex items-center gap-1.5">
              <span className={cn("inline-flex h-1.5 w-1.5 rounded-full", networkColor)} />
              {chainName}
            </span>
          </div>

          <div className="p-1">
            {/* View on Explorer */}
            <a
              href={getExplorerUrl(chainId, address)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-white/[0.03] rounded-lg transition-colors"
            >
              <ExternalLink size={14} />
              View on Explorer
            </a>

            {/* Disconnect */}
            <button
              type="button"
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger-muted rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
