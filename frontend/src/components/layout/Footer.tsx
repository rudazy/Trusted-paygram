import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative dot-pattern">
      {/* Top gradient border */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Left — Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <span className="font-heading font-bold text-text">
                Trusted PayGram
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-xs">
              Confidential payroll powered by Zama Protocol. Encrypted salaries,
              trust-gated payment flows.
            </p>
          </div>

          {/* Center — Links */}
          <div className="flex items-center justify-start md:justify-center gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://docs.zama.ai/fhevm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Zama Docs
            </a>
            <a
              href="https://eips.ethereum.org/EIPS/eip-7984"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              ERC-7984
            </a>
          </div>

          {/* Right — Credits */}
          <div className="text-left md:text-right">
            <p className="text-xs text-text-muted">
              Built for Zama Developer Program 2026
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.04]">
          <p className="text-center text-[11px] text-text-muted">
            All salary data encrypted on-chain with FHE. Nobody sees what they
            shouldn&apos;t.
          </p>
        </div>
      </div>
    </footer>
  );
}
