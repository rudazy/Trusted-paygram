"use client";

import { useState, useCallback, useEffect } from "react";
import { initFHE, encryptUint64, createEIP712Token } from "@/lib/fhe";
import type { FHEInstance } from "@/lib/fhe";

interface UseFHEReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
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
  requestDecryptToken: (
    contractAddress: string,
    userAddress: string
  ) => Promise<{ publicKey: Uint8Array; signature: string } | null>;
}

export function useFHE(): UseFHEReturn {
  const [instance, setInstance] = useState<FHEInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsInitializing(true);
      try {
        const inst = await initFHE();
        if (!cancelled) {
          setInstance(inst);
          setError(inst ? null : "FHE not available on this network");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "FHE initialization failed"
          );
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const encrypt = useCallback(
    async (
      value: number | bigint,
      contractAddress: string,
      userAddress: string
    ) => {
      return encryptUint64(value, contractAddress, userAddress);
    },
    []
  );

  const requestDecryptToken = useCallback(
    async (contractAddress: string, userAddress: string) => {
      return createEIP712Token(contractAddress, userAddress);
    },
    []
  );

  return {
    isInitialized: instance !== null,
    isInitializing,
    error,
    encrypt,
    requestDecryptToken,
  };
}
