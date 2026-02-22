"use client";

import { useWeb3 } from "@/providers/Web3Provider";
import { truncateAddress } from "@/lib/contracts";

export default function ConnectButton() {
  const {
    address,
    chainName,
    isConnected,
    isLoading,
    isSupportedChain,
    connect,
    disconnect,
  } = useWeb3();

  if (isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-slate-700 text-slate-400 text-sm font-medium cursor-not-allowed"
      >
        Connecting...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {chainName && (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isSupportedChain
              ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
              : "bg-red-900/50 text-red-400 border border-red-800"
          }`}
        >
          {isSupportedChain ? chainName : "Unsupported Network"}
        </span>
      )}
      <button
        onClick={disconnect}
        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
      >
        {truncateAddress(address ?? "")}
      </button>
    </div>
  );
}
