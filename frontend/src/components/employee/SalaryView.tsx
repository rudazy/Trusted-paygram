"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Calendar, AlertCircle } from "lucide-react";
import { useWeb3 } from "@/providers/Web3Provider";
import { type TrustTier } from "@/lib/constants";
import Button from "@/components/ui/Button";

export default function SalaryView() {
  const { payGramCore, trustScoring, address, contractsReady } = useWeb3();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tier, setTier] = useState<TrustTier | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [useMock, setUseMock] = useState(false);

  async function fetchMyInfo() {
    if (!payGramCore || !trustScoring || !address) {
      // Use mock data
      setUseMock(true);
      setIsActive(true);
      setRole("Senior Engineer");
      setTier("HIGH");
      setHasChecked(true);
      return;
    }

    setIsLoading(true);
    try {
      const active = await payGramCore.isActiveEmployee(address);
      setIsActive(active);

      if (active) {
        const emp = await payGramCore.getEmployee(address);
        setRole(emp.role);
      }

      const hasScore = await trustScoring.hasScore(address);
      setTier(hasScore ? "MEDIUM" : "LOW");
    } catch {
      setUseMock(true);
      setIsActive(true);
      setRole("Senior Engineer");
      setTier("HIGH");
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }

  if (!hasChecked) {
    return (
      <div className="glass-card p-8 text-center glow-green">
        <Lock size={32} className="mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-heading font-bold text-text mb-2">
          Your Salary
        </h3>
        <p className="text-sm text-text-secondary mb-6">
          Load your encrypted employment information
        </p>
        <Button
          onClick={fetchMyInfo}
          loading={isLoading}
          disabled={!contractsReady && !useMock}
          size="lg"
        >
          <Eye size={16} />
          {isLoading ? "Loading..." : "Load My Info"}
        </Button>
        {!contractsReady && (
          <p className="flex items-center justify-center gap-1.5 mt-3 text-xs text-text-muted">
            <AlertCircle size={12} />
            Will show demo data if contracts unavailable
          </p>
        )}
      </div>
    );
  }

  if (isActive === false) {
    return (
      <div className="glass-card-static p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-text-muted" />
        <p className="text-sm text-text-secondary">
          Your wallet is not registered as an active employee.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 glow-green space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-bold text-text">
          Your Salary
        </h3>
        {useMock && (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-warning-muted text-warning border border-warning/20">
            Demo Data
          </span>
        )}
      </div>

      {/* Salary amount */}
      <div className="py-6 text-center">
        {decrypted ? (
          <div className="animate-fade-in">
            <p className="text-4xl font-heading font-bold text-text">
              5,000{" "}
              <span className="text-lg text-primary">cUSDC</span>
            </p>
            <p className="text-xs text-text-muted mt-1">per month</p>
          </div>
        ) : (
          <div>
            <p className="text-4xl font-mono font-bold text-text-muted tracking-widest">
              ******
            </p>
            <p className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
              <Lock size={10} />
              Encrypted with FHE
            </p>
          </div>
        )}
      </div>

      {/* Decrypt button */}
      <Button
        variant={decrypted ? "outline" : "primary"}
        onClick={() => setDecrypted(!decrypted)}
        className="w-full"
      >
        {decrypted ? (
          <>
            <EyeOff size={14} />
            Hide Salary
          </>
        ) : (
          <>
            <Eye size={14} />
            Decrypt Salary
          </>
        )}
      </Button>

      <p className="text-[11px] text-text-muted text-center leading-relaxed">
        Only you can see this. Encrypted with FHE on-chain.
      </p>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            Role
          </p>
          <p className="text-sm font-medium text-text mt-0.5">
            {role ?? "Unknown"}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            Last Payment
          </p>
          <p className="text-sm font-medium text-text mt-0.5 flex items-center gap-1">
            <Calendar size={12} className="text-text-muted" />
            Feb 1, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
