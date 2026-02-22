"use client";

import { useWeb3 } from "@/providers/Web3Provider";
import { truncateAddress } from "@/lib/contracts";
import AddEmployee from "@/components/employer/AddEmployee";
import EmployeeList from "@/components/employer/EmployeeList";
import ExecutePayroll from "@/components/employer/ExecutePayroll";
import PayrollHistory from "@/components/employer/PayrollHistory";

export default function EmployerDashboard() {
  const { address, isConnected, chainName, isSupportedChain } = useWeb3();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Employer Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage employees, execute payroll, and track payments
          </p>
        </div>
        {isConnected && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Connected as</p>
            <p className="text-sm font-mono text-slate-300">
              {truncateAddress(address ?? "")}
            </p>
            {chainName && (
              <p className="text-xs text-slate-500 mt-0.5">{chainName}</p>
            )}
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <svg
            className="w-12 h-12 text-slate-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
            />
          </svg>
          <h2 className="text-lg font-semibold text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-sm text-slate-400">
            Connect your wallet to access the employer dashboard
          </p>
        </div>
      ) : !isSupportedChain ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <p className="text-sm text-red-400">
            Please switch to Sepolia or Ethereum Mainnet to use this dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <AddEmployee />
            <ExecutePayroll />
          </div>
          <EmployeeList />
          <PayrollHistory />
        </div>
      )}
    </div>
  );
}
