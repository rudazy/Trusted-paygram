"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/providers/Web3Provider";
import { PAYMENT_STATUS } from "@/lib/constants";
import { truncateAddress, formatTimestamp } from "@/lib/contracts";

interface PaymentRecord {
  id: number;
  employee: string;
  status: number;
  createdAt: bigint;
  releaseTime: bigint;
  milestone: string;
}

export default function PayrollHistory() {
  const { payGramCore, contractsReady } = useWeb3();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!payGramCore) return;

    setIsLoading(true);
    try {
      const nextId = await payGramCore.nextPaymentId();
      const total = Number(nextId);
      const records: PaymentRecord[] = [];

      for (let i = 0; i < total && i < 50; i++) {
        try {
          const p = await payGramCore.getPendingPayment(i);
          records.push({
            id: i,
            employee: p.employee,
            status: Number(p.status),
            createdAt: p.createdAt,
            releaseTime: p.releaseTime,
            milestone: p.milestone,
          });
        } catch {
          // Skip invalid payments
        }
      }

      setPayments(records.reverse());
    } catch {
      // Contract not available
    } finally {
      setIsLoading(false);
    }
  }, [payGramCore]);

  useEffect(() => {
    if (contractsReady) fetchPayments();
  }, [contractsReady, fetchPayments]);

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
        <h3 className="text-lg font-semibold text-white">Payment History</h3>
        <button
          onClick={fetchPayments}
          disabled={isLoading || !contractsReady}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!contractsReady ? (
        <p className="text-sm text-slate-500">
          Connect wallet to view payments
        </p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-slate-500">No payments recorded yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Employee</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium">Release</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {payments.map((p) => (
                <tr key={p.id} className="text-slate-300">
                  <td className="py-3 font-mono text-xs">#{p.id}</td>
                  <td className="py-3 font-mono text-xs">
                    {truncateAddress(p.employee)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-400">
                    {formatTimestamp(p.createdAt)}
                  </td>
                  <td className="py-3 text-xs text-slate-400">
                    {p.releaseTime > 0n
                      ? formatTimestamp(p.releaseTime)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
