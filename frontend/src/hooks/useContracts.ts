"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { getContractInstances } from "@/lib/contracts";

interface UseContractsReturn {
  trustScoring: ethers.Contract | null;
  payGramCore: ethers.Contract | null;
  payGramToken: ethers.Contract | null;
  isReady: boolean;
}

/**
 * Returns ethers.Contract instances for all three PayGram contracts.
 * Requires a connected signer and supported chain.
 */
export function useContracts(
  signer: ethers.Signer | null,
  chainId: number | null
): UseContractsReturn {
  const contracts = useMemo(() => {
    if (!signer || !chainId) return null;
    return getContractInstances(chainId, signer);
  }, [signer, chainId]);

  return {
    trustScoring: contracts?.trustScoring ?? null,
    payGramCore: contracts?.payGramCore ?? null,
    payGramToken: contracts?.payGramToken ?? null,
    isReady: contracts !== null,
  };
}
