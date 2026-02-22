"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/providers/Web3Provider";

export default function ExecutePayroll() {
  const { payGramCore, contractsReady } = useWeb3();
  const [activeCount, setActiveCount] = useState<number>(0);
  const [totalPayrolls, setTotalPayrolls] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    if (!payGramCore) return;
    try {
      const count = await payGramCore.activeEmployeeCount();
      setActiveCount(Number(count));
      const payrolls = await payGramCore.totalPayrollsExecuted();
      setTotalPayrolls(Number(payrolls));
    } catch {
      // Contract not available
    }
  }, [payGramCore]);

  useEffect(() => {
    if (contractsReady) fetchStats();
  }, [contractsReady, fetchStats]);

  async function handleExecute() {
    if (!payGramCore) return;

    setIsExecuting(true);
    setShowConfirm(false);
    setStatus(null);

    try {
      const tx = await payGramCore.executePayroll();
      await tx.wait();
      setStatus({
        type: "success",
        message: "Payroll executed successfully",
      });
      fetchStats();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to execute payroll";
      setStatus({ type: "error", message });
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Execute Payroll
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg bg-slate-800/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Active Employees
          </p>
          <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Total Payrolls
          </p>
          <p className="text-2xl font-bold text-white mt-1">{totalPayrolls}</p>
        </div>
      </div>

      {showConfirm ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            This will process payroll for {activeCount} active employee
            {activeCount !== 1 ? "s" : ""}. Trust-gated routing will determine
            payment flows. Proceed?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-medium transition-colors"
            >
              {isExecuting ? "Processing..." : "Confirm Execute"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isExecuting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!contractsReady || activeCount === 0}
          className="w-full px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          Execute Payroll
        </button>
      )}

      {status && (
        <p
          className={`mt-3 text-sm ${
            status.type === "success" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
