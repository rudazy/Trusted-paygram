/**
 * FHE (Fully Homomorphic Encryption) Helper Module
 *
 * This module provides a wrapper around the Zama fhevmjs SDK for creating
 * encrypted inputs that can be sent to FHEVM smart contracts.
 *
 * On chains without FHE support, functions return stubs so the app still builds.
 * Full FHE integration requires the fhevmjs package and a running FHEVM node.
 */

// Type stubs for FHE instance
export interface FHEInstance {
  createEncryptedInput: (
    contractAddress: string,
    userAddress: string
  ) => EncryptedInputBuilder;
}

export interface EncryptedInputBuilder {
  add64: (value: number | bigint) => EncryptedInputBuilder;
  encrypt: () => Promise<{ handles: Uint8Array[]; inputProof: Uint8Array }>;
}

let fheInstance: FHEInstance | null = null;

/**
 * Initializes the FHE instance for the current chain.
 * Returns null if fhevmjs is not available or chain doesn't support FHE.
 */
export async function initFHE(): Promise<FHEInstance | null> {
  if (fheInstance) return fheInstance;

  try {
    // Runtime-only import — webpack must not try to resolve this at build time.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const importFn = new Function("specifier", "return import(specifier)");
    const fhevm = await importFn("fhevmjs");
    const instance = await fhevm.createInstance({
      networkUrl: window.ethereum
        ? await getChainRpcUrl()
        : "http://localhost:8545",
      gatewayUrl: "https://gateway.zama.ai",
    });
    fheInstance = instance as unknown as FHEInstance;
    return fheInstance;
  } catch {
    console.warn(
      "fhevmjs not available — FHE operations will use plaintext fallbacks"
    );
    return null;
  }
}

/**
 * Encrypts a uint64 value for a specific contract.
 * Falls back to returning the plaintext value if FHE is unavailable.
 */
export async function encryptUint64(
  value: number | bigint,
  contractAddress: string,
  userAddress: string
): Promise<{
  encrypted: boolean;
  handles?: Uint8Array[];
  inputProof?: Uint8Array;
  plaintextValue?: bigint;
}> {
  const instance = await initFHE();

  if (!instance) {
    return {
      encrypted: false,
      plaintextValue: BigInt(value),
    };
  }

  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add64(value);
  const result = await input.encrypt();

  return {
    encrypted: true,
    handles: result.handles,
    inputProof: result.inputProof,
  };
}

/**
 * Creates an EIP-712 token for re-encryption requests.
 * This allows a user to decrypt their own encrypted values off-chain.
 */
export async function createEIP712Token(
  _contractAddress: string,
  _userAddress: string
): Promise<{ publicKey: Uint8Array; signature: string } | null> {
  // TODO: Implement with fhevmjs generateToken + sign flow
  // This requires:
  // 1. instance.generateToken({ verifyingContract, userAddress })
  // 2. Sign with user's wallet via EIP-712
  // 3. Return { publicKey, signature } for re-encryption gateway
  console.warn("EIP-712 token creation not yet implemented");
  return null;
}

async function getChainRpcUrl(): Promise<string> {
  try {
    if (!window.ethereum) return "http://localhost:8545";
    const chainIdHex = (await window.ethereum.request({
      method: "eth_chainId",
    })) as string;
    const chainId = parseInt(chainIdHex, 16);
    if (chainId === 11155111) return "https://devnet.zama.ai";
    return "http://localhost:8545";
  } catch {
    return "http://localhost:8545";
  }
}

// Extend Window type for ethereum provider
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
      isMetaMask?: boolean;
    };
  }
}
