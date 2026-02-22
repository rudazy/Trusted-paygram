# Trusted PayGram — Frontend

Next.js 14 web application for the Trusted PayGram confidential payroll system.

## Stack

- **Next.js 14** — App Router with TypeScript
- **ethers.js v6** — Wallet connection and contract interaction
- **TailwindCSS** — Dark theme UI
- **fhevmjs** — Zama FHE client (optional, runtime-loaded)

## Pages

- **/** — Landing page with feature overview
- **/employer** — Employer dashboard: add employees, execute payroll, view payment history
- **/employee** — Employee portal: view salary (encrypted), trust tier, payment history

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Contract Integration

Contract ABIs are stored in `src/lib/abis/`. After deployment, update the addresses in `src/lib/constants.ts` under `CONTRACT_ADDRESSES`.

FHE encryption requires the `fhevmjs` package and a running FHEVM node. Without it, the app falls back to plaintext helpers for local development.
