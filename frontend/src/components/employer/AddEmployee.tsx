"use client";

import { useState, type FormEvent } from "react";
import { Lock, AlertCircle, CheckCircle } from "lucide-react";
import { useWeb3 } from "@/providers/Web3Provider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Dialog from "@/components/ui/Dialog";

interface AddEmployeeProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddEmployee({
  open,
  onClose,
  onSuccess,
}: AddEmployeeProps) {
  const { payGramCore, contractsReady } = useWeb3();
  const [wallet, setWallet] = useState("");
  const [salary, setSalary] = useState("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function resetForm() {
    setWallet("");
    setSalary("");
    setRole("");
    setStatus(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!payGramCore) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const salaryNum = parseInt(salary, 10);
      if (isNaN(salaryNum) || salaryNum <= 0) {
        throw new Error("Salary must be a positive number");
      }

      const tx = await payGramCore.addEmployeePlaintext(
        wallet,
        salaryNum,
        role
      );
      await tx.wait();

      setStatus({ type: "success", message: "Employee added successfully" });
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add employee";
      setStatus({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add Employee"
      description="Register a new team member with encrypted salary"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Wallet Address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x..."
          required
          hint="Employee's Ethereum address"
        />

        <Input
          label="Monthly Salary (cUSDC)"
          type="number"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="5000"
          min="1"
          required
          hint="Encrypted on-chain via FHE"
        />

        <Input
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Senior Engineer"
          required
        />

        <div className="pt-2 space-y-3">
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!contractsReady}
            className="w-full"
            size="lg"
          >
            <Lock size={14} />
            {isSubmitting ? "Submitting..." : "Add Employee"}
          </Button>

          {!contractsReady && (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <AlertCircle size={12} />
              Connect wallet to a supported network first
            </p>
          )}

          <p className="text-[11px] text-text-muted leading-relaxed">
            Salary is encrypted on-chain via FHE. Only the employee and
            employer can decrypt their own values.
          </p>
        </div>

        {status && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
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
      </form>
    </Dialog>
  );
}
