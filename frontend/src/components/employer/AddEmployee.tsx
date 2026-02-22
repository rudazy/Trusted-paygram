"use client";

import { useState, type FormEvent } from "react";
import { useWeb3 } from "@/providers/Web3Provider";

export default function AddEmployee() {
  const { payGramCore, address, encrypt, contractsReady } = useWeb3();
  const [wallet, setWallet] = useState("");
  const [salary, setSalary] = useState("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!payGramCore || !address) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const salaryNum = parseInt(salary, 10);
      if (isNaN(salaryNum) || salaryNum <= 0) {
        throw new Error("Salary must be a positive number");
      }

      // Try encrypted path first, fall back to plaintext
      const coreAddress = await payGramCore.getAddress();
      const result = await encrypt(salaryNum, coreAddress, address);

      if (result.encrypted && result.handles && result.inputProof) {
        // FHE path: send encrypted salary
        const tx = await payGramCore.addEmployee(
          wallet,
          result.handles[0],
          result.inputProof,
          role
        );
        await tx.wait();
      } else {
        // Plaintext fallback (testing / local dev)
        const tx = await payGramCore.addEmployeePlaintext(
          wallet,
          salaryNum,
          role
        );
        await tx.wait();
      }

      setStatus({ type: "success", message: "Employee added successfully" });
      setWallet("");
      setSalary("");
      setRole("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add employee";
      setStatus({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Add Employee</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="emp-wallet"
            className="block text-sm text-slate-400 mb-1"
          >
            Wallet Address
          </label>
          <input
            id="emp-wallet"
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            required
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="emp-salary"
            className="block text-sm text-slate-400 mb-1"
          >
            Salary (cPAY)
          </label>
          <input
            id="emp-salary"
            type="number"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="5000"
            min="1"
            required
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="emp-role"
            className="block text-sm text-slate-400 mb-1"
          >
            Role
          </label>
          <input
            id="emp-role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Engineer"
            required
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !contractsReady}
          className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {isSubmitting ? "Encrypting & Submitting..." : "Add Employee (Encrypted)"}
        </button>

        {status && (
          <p
            className={`text-sm ${
              status.type === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}
