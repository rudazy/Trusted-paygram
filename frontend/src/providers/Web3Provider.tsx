"use client";

import React, { createContext, useContext } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useFHE } from "@/hooks/useFHE";
import { useContracts } from "@/hooks/useContracts";

interface Web3ContextValue {
  // Wallet
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  chainName: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isSupportedChain: boolean;
  walletError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;

  // FHE
  fheReady: boolean;
  fheError: string | null;
  encrypt: (
    value: number | bigint,
    contractAddress: string,
    userAddress: string
  ) => Promise<{
    encrypted: boolean;
    handles?: Uint8Array[];
    inputProof?: Uint8Array;
    plaintextValue?: bigint;
  }>;

  // Contracts
  trustScoring: ethers.Contract | null;
  payGramCore: ethers.Contract | null;
  payGramToken: ethers.Contract | null;
  contractsReady: boolean;
}

const Web3Context = createContext<Web3ContextValue | null>(null);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const fhe = useFHE();
  const contracts = useContracts(wallet.signer, wallet.chainId);

  const value: Web3ContextValue = {
    address: wallet.address,
    provider: wallet.provider,
    signer: wallet.signer,
    chainId: wallet.chainId,
    chainName: wallet.chainName,
    isConnected: wallet.isConnected,
    isLoading: wallet.isLoading,
    isSupportedChain: wallet.isSupportedChain,
    walletError: wallet.error,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
    switchChain: wallet.switchChain,
    fheReady: fhe.isInitialized,
    fheError: fhe.error,
    encrypt: fhe.encrypt,
    trustScoring: contracts.trustScoring,
    payGramCore: contracts.payGramCore,
    payGramToken: contracts.payGramToken,
    contractsReady: contracts.isReady,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3(): Web3ContextValue {
  const ctx = useContext(Web3Context);
  if (!ctx) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return ctx;
}
