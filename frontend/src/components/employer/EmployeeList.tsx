"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/providers/Web3Provider";
import { truncateAddress, formatTimestamp } from "@/lib/contracts";

interface EmployeeData {
  wallet: string;
  isActive: boolean;
  hireDate: bigint;
  lastPayDate: bigint;
  role: string;
}

export default function EmployeeList() {
  const { payGramCore, contractsReady } = useWeb3();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!payGramCore) return;

    setIsLoading(true);
    try {
      const addresses: string[] = await payGramCore.getEmployeeList();
      const empData: EmployeeData[] = [];

      for (const addr of addresses) {
        try {
          const emp = await payGramCore.getEmployee(addr);
          empData.push({
            wallet: emp.empWallet,
            isActive: emp.isActive,
            hireDate: emp.hireDate,
            lastPayDate: emp.lastPayDate,
            role: emp.role,
          });
        } catch {
          // Skip if getEmployee fails
        }
      }

      setEmployees(empData);
    } catch {
      // Contract not available or no employees
    } finally {
      setIsLoading(false);
    }
  }, [payGramCore]);

  useEffect(() => {
    if (contractsReady) {
      fetchEmployees();
    }
  }, [contractsReady, fetchEmployees]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Employee Roster</h3>
        <button
          onClick={fetchEmployees}
          disabled={isLoading || !contractsReady}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!contractsReady ? (
        <p className="text-sm text-slate-500">
          Connect wallet to view employees
        </p>
      ) : employees.length === 0 ? (
        <p className="text-sm text-slate-500">No employees registered yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="pb-3 font-medium">Address</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Hire Date</th>
                <th className="pb-3 font-medium">Last Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {employees.map((emp) => (
                <tr key={emp.wallet} className="text-slate-300">
                  <td className="py-3 font-mono text-xs">
                    {truncateAddress(emp.wallet)}
                  </td>
                  <td className="py-3">{emp.role}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.isActive
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {emp.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-400">
                    {formatTimestamp(emp.hireDate)}
                  </td>
                  <td className="py-3 text-xs text-slate-400">
                    {formatTimestamp(emp.lastPayDate)}
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
