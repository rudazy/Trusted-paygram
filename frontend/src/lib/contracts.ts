import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./constants";

import TRUST_SCORING_ABI from "./abis/TrustScoring.json";
import PAYGRAM_CORE_ABI from "./abis/PayGramCore.json";
import PAYGRAM_TOKEN_ABI from "./abis/PayGramToken.json";

export { TRUST_SCORING_ABI, PAYGRAM_CORE_ABI, PAYGRAM_TOKEN_ABI };

/**
 * Returns contract addresses for the given chain ID, or null
 * if the chain is not supported.
 */
export function getAddresses(chainId: number) {
  return CONTRACT_ADDRESSES[chainId] ?? null;
}

/**
 * Creates an ethers.Contract instance for a given contract.
 */
function getContract(
  address: string,
  abi: ethers.InterfaceAbi,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Returns all three contract instances for the given chain.
 * Uses the signer so transactions can be sent.
 */
export function getContractInstances(
  chainId: number,
  signer: ethers.Signer
): {
  trustScoring: ethers.Contract;
  payGramCore: ethers.Contract;
  payGramToken: ethers.Contract;
} | null {
  const addrs = getAddresses(chainId);
  if (!addrs) return null;

  return {
    trustScoring: getContract(addrs.trustScoring, TRUST_SCORING_ABI, signer),
    payGramCore: getContract(addrs.payGramCore, PAYGRAM_CORE_ABI, signer),
    payGramToken: getContract(addrs.payGramToken, PAYGRAM_TOKEN_ABI, signer),
  };
}

/**
 * Truncates an Ethereum address for display: 0x1234...5678
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats a timestamp (seconds since epoch) to a locale string.
 */
export function formatTimestamp(ts: number | bigint): string {
  const num = typeof ts === "bigint" ? Number(ts) : ts;
  if (num === 0) return "Never";
  return new Date(num * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
