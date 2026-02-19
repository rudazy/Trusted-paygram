# Setup Guide — Trusted PayGram

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18.x | Runtime |
| npm | >= 9.x | Package management |
| Git | >= 2.x | Version control |
| MetaMask | Latest | Browser wallet for Sepolia interaction |

## Installation

```bash
git clone https://github.com/<your-org>/trusted-paygram.git
cd trusted-paygram
npm install
```

## Hardhat Configuration Variables

Trusted PayGram uses Hardhat's built-in `vars` system instead of `.env` files.  Set your variables with:

```bash
# Required for Sepolia / Mainnet deployment
npx hardhat vars set MNEMONIC
# Enter your 12-word seed phrase when prompted

npx hardhat vars set INFURA_API_KEY
# Enter your Infura project ID

npx hardhat vars set ETHERSCAN_API_KEY
# Enter your Etherscan API key (for contract verification)
```

To view currently set variables:

```bash
npx hardhat vars list
```

> **Note:** For local development only, you do not need to set any variables — the config uses safe defaults (Hardhat's test mnemonic and empty API keys).

## Local Development

### Compile contracts

```bash
npm run compile
```

### Run the test suite

```bash
npm test
```

### Start a local Hardhat node

```bash
npm run node
```

### Deploy to localhost

In a separate terminal (while the node is running):

```bash
npm run deploy:localhost
```

The deploy script will print all contract addresses.

## Sepolia Testnet Deployment

### 1. Get Sepolia ETH

Visit a Sepolia faucet to obtain test ETH for your deployer address:
- https://sepoliafaucet.com
- https://faucets.chain.link/sepolia

### 2. Set Hardhat variables

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
```

### 3. Deploy

```bash
npm run deploy:sepolia
```

### 4. Verify on Etherscan (optional)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS...>
```

## MetaMask Configuration

To interact with deployed contracts on Sepolia:

1. Open MetaMask and switch to the **Sepolia** test network
2. Import the `cPAY` token:
   - Click "Import tokens"
   - Paste the deployed `PayGramToken` contract address
   - Symbol: `cPAY`
   - Decimals: `18`

> **Note:** Because cPAY uses encrypted balances (ERC-7984), MetaMask will not display the actual balance.  Use the frontend application or direct contract calls with FHE decryption to view balances.

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile Solidity contracts |
| `npm test` | Run all tests |
| `npm run node` | Start local Hardhat node |
| `npm run deploy:localhost` | Deploy to local node |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run clean` | Remove build artifacts |
| `npm run lint` | Lint Solidity files |
| `npm run coverage` | Generate test coverage report |

## Troubleshooting

### "Cannot find module @fhevm/solidity"

Make sure you have installed dependencies:

```bash
npm install
```

If the issue persists, clear the cache and reinstall:

```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### Hardhat compilation errors with FHEVM

Ensure your `hardhat.config.ts` includes the FHEVM plugin:

```typescript
import "@fhevm/solidity/hardhat";
```

And that the Solidity version is set to `0.8.24` with `evmVersion: "cancun"`.

### "Nonce too high" on Sepolia

Reset your MetaMask account nonce:
1. MetaMask → Settings → Advanced → Clear activity tab data

### Local node tests failing

The local Hardhat node does not include the FHE coprocessor.  Some FHE operations will only work on networks with the Zama coprocessor deployed (Sepolia with Zama gateway).  Unit tests should mock FHE operations where necessary.
