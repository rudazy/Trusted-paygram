"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { SUPPORTED_CHAINS } from "@/lib/constants";

export interface WalletState {
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

const SUPPORTED_CHAIN_IDS: number[] = Object.values(SUPPORTED_CHAINS).map(
  (c) => c.chainId
);

const SEPOLIA_CHAIN_ID = SUPPORTED_CHAINS.sepolia.chainId; // 11155111
const SEPOLIA_HEX = "0xaa36a7";

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    provider: null,
    signer: null,
    chainId: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const [hasWallet, setHasWallet] = useState(false);

  // Detect wallet on mount (client-side only)
  useEffect(() => {
    setHasWallet(typeof window !== "undefined" && !!window.ethereum);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState((prev) => ({
        ...prev,
        error: "No wallet detected. Please install MetaMask.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setState({
        address,
        provider,
        signer,
        chainId,
        isConnected: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      isConnected: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) return;

    const hexChainId = `0x${targetChainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to switch chain";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_HEX }],
      });
    } catch (err: unknown) {
      // Error code 4902 = chain not added to wallet
      const switchError = err as { code?: number };
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_HEX,
                chainName: "Sepolia Testnet",
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addErr) {
          const message =
            addErr instanceof Error
              ? addErr.message
              : "Failed to add Sepolia network";
          setState((prev) => ({ ...prev, error: message }));
        }
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to switch to Sepolia";
        setState((prev) => ({ ...prev, error: message }));
      }
    }
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else if (state.isConnected) {
        // Re-derive signer for the new account
        try {
          const provider = new ethers.BrowserProvider(window.ethereum!);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setState((prev) => ({ ...prev, address, provider, signer }));
        } catch {
          disconnect();
        }
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      const newChainId = parseInt(chainIdHex, 16);
      setState((prev) => ({ ...prev, chainId: newChainId }));
      // Reconnect to get fresh provider/signer for new chain
      if (state.isConnected) {
        connect();
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [state.isConnected, connect, disconnect]);

  const chainName = state.chainId
    ? Object.values(SUPPORTED_CHAINS).find(
        (c) => c.chainId === state.chainId
      )?.name ?? `Chain ${state.chainId}`
    : null;

  const isSupportedChain = state.chainId
    ? SUPPORTED_CHAIN_IDS.includes(state.chainId)
    : false;

  const isSepolia = state.chainId === SEPOLIA_CHAIN_ID;

  return {
    ...state,
    hasWallet,
    chainName,
    isSupportedChain,
    isSepolia,
    connect,
    disconnect,
    switchChain,
    switchToSepolia,
  };
}
