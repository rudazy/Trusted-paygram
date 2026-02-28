export const SUPPORTED_CHAINS = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/",
    blockExplorer: "https://sepolia.etherscan.io",
  },
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/",
    blockExplorer: "https://etherscan.io",
  },
} as const;

/** Deployed contract addresses — Sepolia & Mainnet (2026-02-28) */
export const CONTRACT_ADDRESSES: Record<
  number,
  { trustScoring: string; payGramCore: string; payGramToken: string }
> = {
  [SUPPORTED_CHAINS.sepolia.chainId]: {
    trustScoring: "0xbFF470d080D0BC36CcDcE8f5d1D6C98517F15df7",
    payGramToken: "0xC97C848E7021AdFC36269ddc5e39E54939E81704",
    payGramCore: "0x331048736e7dC599E46187CaBa00dcC46952a7d7",
  },
  [SUPPORTED_CHAINS.mainnet.chainId]: {
    trustScoring: "0xaa3ae25ebac250ff67f4d9e3195c4c7610055067",
    payGramToken: "0x41fa55cefd625e50fa1ae08baea87ac5c8be0ad7",
    payGramCore: "0xDC41FF140129846f7a2e63A5CcE73e9d767CB4e1",
  },
};

export const TRUST_TIERS = {
  HIGH: {
    min: 75,
    label: "High Trust",
    color: "green",
    icon: "shield-check",
    description: "Instant encrypted transfer",
  },
  MEDIUM: {
    min: 40,
    label: "Medium Trust",
    color: "yellow",
    icon: "clock",
    description: "24-hour delayed release",
  },
  LOW: {
    min: 0,
    label: "Low Trust",
    color: "red",
    icon: "lock",
    description: "Milestone-gated escrow",
  },
} as const;

export type TrustTier = keyof typeof TRUST_TIERS;

export const PAYMENT_STATUS = {
  0: "None",
  1: "Instant",
  2: "Delayed",
  3: "Escrowed",
  4: "Released",
  5: "Completed",
} as const;

export const DELAY_PERIOD_SECONDS = 24 * 60 * 60; // 24 hours
