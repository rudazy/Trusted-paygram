"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/providers/Web3Provider";
import { PAYMENT_STATUS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/contracts";

interface PaymentRecord {
  id: number;
  status: number;
  createdAt: bigint;
  releaseTime: bigint;
  milestone: string;
}

export default function PaymentHistory() {
  const { payGramCore, address, contractsReady } = useWeb3();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!payGramCore || !address) return;

    setIsLoading(true);
    try {
      const ids: bigint[] =
        await payGramCore.getPendingPaymentsForEmployee(address);
      const records: PaymentRecord[] = [];

      for (const id of ids) {
        try {
          const p = await payGramCore.getPendingPayment(id);
          records.push({
            id: Number(id),
            status: Number(p.status),
            createdAt: p.createdAt,
            releaseTime: p.releaseTime,
            milestone: p.milestone,
          });
        } catch {
          // Skip invalid
        }
      }

      setPayments(records.reverse());
    } catch {
      // Contract not available
    } finally {
      setIsLoading(false);
    }
  }, [payGramCore, address]);

  useEffect(() => {
    if (contractsReady && address) fetchPayments();
  }, [contractsReady, address, fetchPayments]);

  const statusLabel = (s: number) =>
    PAYMENT_STATUS[s as keyof typeof PAYMENT_STATUS] ?? "Unknown";

  const statusColor = (s: number) => {
    switch (s) {
      case 1:
        return "text-emerald-400 bg-emerald-900/50";
      case 2:
        return "text-yellow-400 bg-yellow-900/50";
      case 3:
        return "text-red-400 bg-red-900/50";
      case 4:
        return "text-blue-400 bg-blue-900/50";
      case 5:
        return "text-slate-400 bg-slate-800";
      default:
        return "text-slate-500 bg-slate-800";
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">My Payments</h3>
        <button
          onClick={fetchPayments}
          disabled={isLoading || !contractsReady}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!contractsReady || !address ? (
        <p className="text-sm text-slate-500">
          Connect wallet to view your payments
        </p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-slate-500">No payment records found</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="rounded-lg bg-slate-800/50 p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-slate-300">
                    Payment #{p.id}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}
                  >
                    {statusLabel(p.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Created {formatTimestamp(p.createdAt)}
                  {p.releaseTime > 0n &&
                    ` • Releases ${formatTimestamp(p.releaseTime)}`}
                </p>
                {p.milestone && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.milestone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-mono text-slate-400">
                  *** cPAY
                </span>
                <p className="text-xs text-slate-500">Encrypted</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
