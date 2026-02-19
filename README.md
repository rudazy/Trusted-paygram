# Trusted PayGram

**Confidential Trust-Gated Payroll on Zama FHEVM**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![FHEVM](https://img.shields.io/badge/Zama_FHEVM-v0.9-7B3FE4)](https://docs.zama.ai/fhevm)
[![ERC-7984](https://img.shields.io/badge/ERC--7984-Confidential_Token-3C3C3D)](https://eips.ethereum.org/EIPS/eip-7984)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

Trusted PayGram is a fully confidential onchain payroll system where companies pay employees using **ERC-7984 encrypted tokens** while incorporating **EigenTrust-based reputation scoring** to gate payment flows.  Salary amounts, trust scores, and transaction details remain encrypted throughout — the smart contracts make decisions on ciphertext without ever decrypting.

> Built for the **Zama Developer Program Special Bounty Track**.

---

## Architecture

```
                            ┌──────────────────────┐
                            │    Oracle Network     │
                            │  (EigenTrust scores)  │
                            └──────────┬───────────┘
                                       │ setTrustScore(encrypted)
                                       ▼
┌─────────────┐  executePayroll  ┌─────────────────┐  isHighTrust?   ┌──────────────────┐
│  Employer    │────────────────▶│  PayGramCore     │───────────────▶│  TrustScoring     │
│  Dashboard   │                 │  (Payroll Engine)│◀───────────────│  (FHE Tier Eval)  │
└─────────────┘                 └────────┬─────────┘  ebool result   └──────────────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                     HIGH tier      MEDIUM tier     LOW tier
                     (instant)     (24h delay)     (escrow)
                          │              │              │
                          ▼              ▼              ▼
                   ┌──────────────────────────────────────┐
                   │         PayGramToken (cPAY)          │
                   │      ERC-7984 Confidential Token     │
                   │    Encrypted balances & transfers    │
                   └──────────────────────────────────────┘
```

## Features

| Feature | Description |
|---|---|
| **Encrypted Salaries** | Salary amounts stored and transferred as FHE ciphertexts — invisible to observers |
| **Confidential Trust Scores** | EigenTrust reputation evaluated entirely under encryption |
| **Trust-Gated Routing** | Payment method selected by FHE comparison — no plaintext branch |
| **ERC-7984 Token** | Native confidential token standard with encrypted balances |
| **Time-Locked Payments** | Medium-trust payments held for 24 hours before release |
| **Escrow with Milestones** | Low-trust payments require employer confirmation |
| **Observer Auditing** | Planned employer audit access via FHE grants |

## Trust Tiers

| Tier | Score Range | Payment Method | Rationale |
|------|-------------|----------------|-----------|
| **HIGH** | 75 – 100 | Instant encrypted transfer | Established, reliable contributors |
| **MEDIUM** | 40 – 74 | 24-hour delayed release | Moderate history, time buffer for disputes |
| **LOW** | 0 – 39 | Escrowed with milestone release | New or flagged participants, manual approval |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity 0.8.24 |
| FHE Runtime | Zama FHEVM v0.9 |
| Token Standard | ERC-7984 (OpenZeppelin Confidential Contracts) |
| Framework | Hardhat + TypeScript |
| Access Control | OpenZeppelin Ownable2Step |
| Target Networks | Sepolia Testnet, Ethereum Mainnet |

## Quick Start

```bash
# Clone and install
git clone https://github.com/<your-org>/trusted-paygram.git
cd trusted-paygram
npm install

# Compile contracts
npm run compile

# Run test suite
npm test

# Start local node
npm run node

# Deploy locally (separate terminal)
npm run deploy:localhost
```

See [docs/SETUP.md](docs/SETUP.md) for detailed configuration including Sepolia deployment.

## Contract Addresses

> Deployed addresses will be listed here after Sepolia deployment.

| Contract | Address | Explorer |
|----------|---------|----------|
| TrustScoring | TBD | — |
| PayGramToken | TBD | — |
| PayGramCore | TBD | — |

## ERC-7984 Integration

Trusted PayGram uses the [ERC-7984](https://eips.ethereum.org/EIPS/eip-7984) confidential token standard implemented by OpenZeppelin.  This provides:

- **Encrypted balances** — token holdings are FHE ciphertexts, not public `uint256` values
- **Confidential transfers** — transfer amounts are encrypted; only sender, recipient, and authorized observers can decrypt
- **Selective disclosure** — the employer can be granted observer access for payroll auditing without exposing data to the network

The `PayGramToken` contract extends `ERC7984` and mints `cPAY` tokens that serve as the payroll medium within the system.

## Project Structure

```
contracts/
  TrustScoring.sol    — Encrypted trust score storage and tier evaluation
  PayGramCore.sol     — Payroll engine with trust-gated payment routing
  PayGramToken.sol    — ERC-7984 confidential token (cPAY)
deploy/
  deploy.ts           — Hardhat-deploy script for all contracts
test/
  TrustScoring.test.ts
  PayGramCore.test.ts
  integration.test.ts
docs/
  ARCHITECTURE.md     — System design and data flows
  TRUST_MODEL.md      — EigenTrust adaptation and privacy model
  SETUP.md            — Installation and deployment guide
```

## Acknowledgments

- [Zama](https://zama.ai/) — FHEVM and the fhevm-solidity library
- [OpenZeppelin](https://openzeppelin.com/) — Confidential Contracts (ERC-7984) and access control primitives
- [EigenTrust](https://nlp.stanford.edu/pubs/eigentrust.pdf) — Distributed reputation framework adapted for on-chain scoring
- [Intuition Protocol](https://intuition.systems/) — Inspiration for trust-weighted decentralized identity

## License

[MIT](LICENSE)
