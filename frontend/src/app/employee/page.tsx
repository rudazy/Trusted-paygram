"use client";

import { useWeb3 } from "@/providers/Web3Provider";
import { truncateAddress } from "@/lib/contracts";
import SalaryView from "@/components/employee/SalaryView";
import PaymentHistory from "@/components/employee/PaymentHistory";

export default function EmployeePortal() {
  const { address, isConnected, chainName, isSupportedChain } = useWeb3();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Portal</h1>
          <p className="text-sm text-slate-400 mt-1">
            View your salary, trust tier, and payment history
          </p>
        </div>
        {isConnected && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Connected as</p>
            <p className="text-sm font-mono text-slate-300">
              {truncateAddress(address ?? "")}
            </p>
            {chainName && (
              <p className="text-xs text-slate-500 mt-0.5">{chainName}</p>
            )}
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <svg
            className="w-12 h-12 text-slate-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-sm text-slate-400">
            Connect your wallet to view your employment details
          </p>
        </div>
      ) : !isSupportedChain ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <p className="text-sm text-red-400">
            Please switch to Sepolia or Ethereum Mainnet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <SalaryView />
          <PaymentHistory />
        </div>
      )}
    </div>
  );
}
