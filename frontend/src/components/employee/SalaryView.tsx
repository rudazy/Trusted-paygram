"use client";

import { useState } from "react";
import { useWeb3 } from "@/providers/Web3Provider";
import { TRUST_TIERS, type TrustTier } from "@/lib/constants";

export default function SalaryView() {
  const { payGramCore, trustScoring, address, contractsReady } = useWeb3();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tier, setTier] = useState<TrustTier | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchMyInfo() {
    if (!payGramCore || !trustScoring || !address) return;

    setIsLoading(true);
    try {
      // Check if current user is an employee
      const active = await payGramCore.isActiveEmployee(address);
      setIsActive(active);

      if (active) {
        const emp = await payGramCore.getEmployee(address);
        setRole(emp.role);
      }

      // Check trust score
      const hasScore = await trustScoring.hasScore(address);
      if (hasScore) {
        // We can't decrypt the tier without FHE, but we know they have a score
        setTier("MEDIUM"); // Placeholder — real tier requires FHE decryption
      } else {
        setTier("LOW");
      }
    } catch {
      // Not an employee or contract not available
      setIsActive(false);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }

  const tierInfo = tier ? TRUST_TIERS[tier] : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">My Employment</h3>

      {!contractsReady ? (
        <p className="text-sm text-slate-500">
          Connect wallet to view your details
        </p>
      ) : !hasChecked ? (
        <button
          onClick={fetchMyInfo}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          {isLoading ? "Loading..." : "Load My Info"}
        </button>
      ) : isActive === false ? (
        <p className="text-sm text-slate-400">
          Your wallet is not registered as an active employee.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Role */}
          <div className="rounded-lg bg-slate-800/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Role
            </p>
            <p className="text-lg font-medium text-white mt-1">
              {role ?? "Unknown"}
            </p>
          </div>

          {/* Salary (encrypted) */}
          <div className="rounded-lg bg-slate-800/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Your Salary
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-lg font-mono text-slate-400">
                *** Encrypted ***
              </span>
              <button
                className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
                onClick={() => {
                  // TODO: Implement FHE decrypt flow via EIP-712 reencryption
                  alert(
                    "Decryption requires FHE reencryption gateway — coming soon"
                  );
                }}
              >
                Decrypt
              </button>
            </div>
          </div>

          {/* Trust Tier Badge */}
          {tierInfo && (
            <div className="rounded-lg bg-slate-800/50 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Trust Tier
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TierBadge tier={tier!} />
                <span className="text-sm text-slate-400">
                  {tierInfo.description}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TierBadge({ tier }: { tier: TrustTier }) {
  const info = TRUST_TIERS[tier];
  const colorClasses = {
    green: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
    yellow: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
    red: "bg-red-900/50 text-red-400 border-red-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[info.color]}`}
    >
      {tier === "HIGH" && (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      )}
      {tier === "MEDIUM" && (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      {tier === "LOW" && (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      )}
      {info.label}
    </span>
  );
}
