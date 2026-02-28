"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, FileText, Lock } from "lucide-react";
import { useWeb3 } from "@/providers/Web3Provider";
import { PAYMENT_STATUS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/contracts";
import { MOCK_EMPLOYEE_PAYMENTS } from "@/lib/mockData";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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
  const [useMock, setUseMock] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!payGramCore || !address) {
      setUseMock(true);
      return;
    }

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
      setUseMock(records.length === 0);
    } catch {
      setUseMock(true);
    } finally {
      setIsLoading(false);
    }
  }, [payGramCore, address]);

  useEffect(() => {
    if (contractsReady && address) {
      fetchPayments();
    } else {
      setUseMock(true);
    }
  }, [contractsReady, address, fetchPayments]);

  const statusLabel = (s: number) =>
    PAYMENT_STATUS[s as keyof typeof PAYMENT_STATUS] ?? "Unknown";

  function statusVariant(
    s: number | string
  ): "primary" | "warning" | "danger" | "secondary" | "default" {
    if (typeof s === "string") {
      switch (s) {
        case "completed":
          return "primary";
        case "delayed":
        case "released":
          return "warning";
        case "escrowed":
          return "danger";
        default:
          return "default";
      }
    }
    switch (s) {
      case 1:
        return "primary";
      case 2:
        return "warning";
      case 3:
        return "danger";
      case 4:
        return "secondary";
      case 5:
        return "default";
      default:
        return "default";
    }
  }

  const showMock = useMock;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-bold text-text">
          Payment History
        </h3>
        <div className="flex items-center gap-2">
          {showMock && (
            <Badge variant="warning" size="sm">
              Demo Data
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPayments}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {showMock ? (
        <div className="space-y-3">
          {MOCK_EMPLOYEE_PAYMENTS.map((p) => (
            <div
              key={p.id}
              className="glass-card-static p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-text-secondary">
                    Payment #{p.id}
                  </span>
                  <Badge variant={statusVariant(p.status)} size="sm">
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {p.type}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(p.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-sm font-mono text-text-muted">
                  <Lock size={10} />
                  Encrypted
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="glass-card-static p-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-text-muted" />
          <p className="text-sm font-medium text-text mb-1">
            No payments yet
          </p>
          <p className="text-xs text-text-muted">
            Your payment records will appear here after payroll execution
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="glass-card-static p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-text-secondary">
                    Payment #{p.id}
                  </span>
                  <Badge variant={statusVariant(p.status)} size="sm">
                    {statusLabel(p.status)}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Created {formatTimestamp(p.createdAt)}
                  {p.releaseTime > 0n &&
                    ` \u2022 Releases ${formatTimestamp(p.releaseTime)}`}
                </p>
                {p.milestone && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {p.milestone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-sm font-mono text-text-muted">
                  <Lock size={10} />
                  Encrypted
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
