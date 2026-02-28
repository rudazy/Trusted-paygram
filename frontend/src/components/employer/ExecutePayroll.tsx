"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, AlertCircle, CheckCircle, ShieldCheck, Clock, Lock } from "lucide-react";
import { useWeb3 } from "@/providers/Web3Provider";
import { MOCK_STATS } from "@/lib/mockData";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";

export default function ExecutePayroll() {
  const { payGramCore, contractsReady } = useWeb3();
  const [activeCount, setActiveCount] = useState<number>(0);
  const [totalPayrolls, setTotalPayrolls] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    if (!payGramCore) {
      setUseMock(true);
      setActiveCount(MOCK_STATS.activeEmployees);
      setTotalPayrolls(MOCK_STATS.totalPayrolls);
      return;
    }
    try {
      const count = await payGramCore.activeEmployeeCount();
      setActiveCount(Number(count));
      const payrolls = await payGramCore.totalPayrollsExecuted();
      setTotalPayrolls(Number(payrolls));
      setUseMock(false);
    } catch {
      setUseMock(true);
      setActiveCount(MOCK_STATS.activeEmployees);
      setTotalPayrolls(MOCK_STATS.totalPayrolls);
    }
  }, [payGramCore]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
    <div className="space-y-6">
      {/* Summary card */}
      <div className="glass-card-static p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-heading font-bold text-text">
            Payroll Summary
          </h3>
          {useMock && (
            <Badge variant="warning" size="sm">
              Demo Data
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-xs text-text-muted mb-0.5">Active Employees</p>
            <p className="text-xl font-heading font-bold text-text">
              {activeCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-xs text-text-muted mb-0.5">Total Payrolls</p>
            <p className="text-xl font-heading font-bold text-text">
              {totalPayrolls}
            </p>
          </div>
        </div>

        {/* Trust tier routing */}
        <div className="space-y-2 mb-6">
          <p className="text-xs text-text-muted uppercase tracking-wider">
            Routing by Trust Tier
          </p>
          <div className="grid gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary-muted/50 border border-primary/10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-xs text-text-secondary">High Trust</span>
              </div>
              <span className="text-xs font-mono text-primary">Instant</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-warning-muted/50 border border-warning/10">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-warning" />
                <span className="text-xs text-text-secondary">
                  Medium Trust
                </span>
              </div>
              <span className="text-xs font-mono text-warning">24h Hold</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-danger-muted/50 border border-danger/10">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-danger" />
                <span className="text-xs text-text-secondary">Low Trust</span>
              </div>
              <span className="text-xs font-mono text-danger">Escrow</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setShowConfirm(true)}
          disabled={!contractsReady || activeCount === 0}
          className="w-full"
          size="lg"
        >
          <Play size={16} />
          Execute Payroll
        </Button>

        {!contractsReady && (
          <p className="flex items-center gap-1.5 mt-3 text-xs text-warning">
            <AlertCircle size={12} />
            Connect wallet to execute payroll
          </p>
        )}

        {status && (
          <div
            className={`flex items-center gap-2 mt-3 p-3 rounded-lg text-sm ${
              status.type === "success"
                ? "bg-primary-muted text-primary"
                : "bg-danger-muted text-danger"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            {status.message}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Payroll Execution"
        description={`This will process payments for ${activeCount} active employee${activeCount !== 1 ? "s" : ""}.`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Trust-gated routing will determine payment flows based on each
            employee&apos;s encrypted trust score. This operation cannot be
            undone.
          </p>

          <div className="grid gap-2">
            <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
              <span className="text-xs text-text-secondary">
                High Trust employees
              </span>
              <span className="text-xs text-primary">Instant transfer</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
              <span className="text-xs text-text-secondary">
                Medium Trust employees
              </span>
              <span className="text-xs text-warning">24h delayed</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
              <span className="text-xs text-text-secondary">
                Low Trust employees
              </span>
              <span className="text-xs text-danger">Escrowed</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleExecute}
              loading={isExecuting}
              className="flex-1"
            >
              Confirm Execute
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isExecuting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
