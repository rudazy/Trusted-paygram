"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Clock, FileText } from "lucide-react";
import { useWeb3 } from "@/providers/Web3Provider";
import { PAYMENT_STATUS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/contracts";
import { MOCK_PAYMENTS, type MockPayment } from "@/lib/mockData";
import AddressDisplay from "@/components/ui/AddressDisplay";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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
  const [useMock, setUseMock] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!payGramCore) {
      setUseMock(true);
      return;
    }

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
      setUseMock(records.length === 0);
    } catch {
      setUseMock(true);
    } finally {
      setIsLoading(false);
    }
  }, [payGramCore]);

  useEffect(() => {
    if (contractsReady) {
      fetchPayments();
    } else {
      setUseMock(true);
    }
  }, [contractsReady, fetchPayments]);

  const statusLabel = (s: number) =>
    PAYMENT_STATUS[s as keyof typeof PAYMENT_STATUS] ?? "Unknown";

  function statusVariant(
    s: number | string
  ): "primary" | "warning" | "danger" | "secondary" | "default" {
    if (typeof s === "string") {
      switch (s) {
        case "completed":
          return "primary";
        case "processing":
          return "warning";
        case "pending":
          return "default";
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

  const displayMock = useMock;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-bold text-text">
          Payment History
        </h3>
        <div className="flex items-center gap-2">
          {displayMock && (
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

      {displayMock ? (
        <MockPaymentTable data={MOCK_PAYMENTS} statusVariant={statusVariant} />
      ) : payments.length === 0 ? (
        <div className="glass-card-static p-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-text-muted" />
          <p className="text-sm font-medium text-text mb-1">
            No payments recorded yet
          </p>
          <p className="text-xs text-text-muted">
            Execute a payroll to see payment records here
          </p>
        </div>
      ) : (
        <div className="glass-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-white/[0.06]">
                  <th className="px-4 py-3 font-medium text-xs">ID</th>
                  <th className="px-4 py-3 font-medium text-xs">Employee</th>
                  <th className="px-4 py-3 font-medium text-xs">Status</th>
                  <th className="px-4 py-3 font-medium text-xs">Created</th>
                  <th className="px-4 py-3 font-medium text-xs">Release</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="text-text-secondary hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">#{p.id}</td>
                    <td className="px-4 py-3">
                      <AddressDisplay address={p.employee} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(p.status)} size="sm">
                        {statusLabel(p.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatTimestamp(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {p.releaseTime > 0n
                        ? formatTimestamp(p.releaseTime)
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Mock table ─── */

function MockPaymentTable({
  data,
  statusVariant,
}: {
  data: MockPayment[];
  statusVariant: (s: string) => "primary" | "warning" | "danger" | "secondary" | "default";
}) {
  return (
    <div className="glass-card-static overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-white/[0.06]">
              <th className="px-4 py-3 font-medium text-xs">Date</th>
              <th className="px-4 py-3 font-medium text-xs">Employees</th>
              <th className="px-4 py-3 font-medium text-xs">Status</th>
              <th className="px-4 py-3 font-medium text-xs">Type</th>
              <th className="px-4 py-3 font-medium text-xs">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {data.map((p) => (
              <tr
                key={p.id}
                className="text-text-secondary hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-xs">
                  {new Date(p.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-xs">{p.employees}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(p.status)} size="sm">
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" size="sm">
                    <Clock size={10} />
                    {p.type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-text-muted">
                  Encrypted
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
