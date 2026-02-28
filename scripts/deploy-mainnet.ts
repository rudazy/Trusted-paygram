import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

// Already deployed in previous attempts
const TRUST_SCORING_ADDR = "0xaa3ae25ebac250ff67f4d9e3195c4c7610055067";
const TRUST_SCORING_TX   = "0x2f64fa35818267678deccfe9f4d19cf349b78dfdb23eeaa50077f637837a63c9";
const PAY_GRAM_TOKEN_ADDR = "0x41fa55cefd625e50fa1ae08baea87ac5c8be0ad7";
const PAY_GRAM_TOKEN_TX   = "0xa9038b3f1ee209d6ef730a72eaf785ec4e2ae10ea640208417b490476b531d19";
const TOKEN_SUPPLY = 0n; // Deployed with 0 (mainnet has no FHE coprocessor)

/**
 * Deploy a contract using raw JSON-RPC to bypass hardhat-ethers to:""
 * parsing bug on contract creation transactions.
 */
async function rawDeploy(
  name: string,
  args: unknown[],
  signer: ethers.Signer
): Promise<{ address: string; txHash: string }> {
  const Factory = await ethers.getContractFactory(name);
  const deployTx = await Factory.getDeployTransaction(...args);

  // Use raw provider to send and avoid hardhat-ethers formatting
  const rawProvider = new ethers.JsonRpcProvider(
    (hre.network.config as { url: string }).url
  );
  const rawWallet = new ethers.Wallet(
    process.env.PRIVATE_KEY!,
    rawProvider
  );

  const nonce = await rawProvider.getTransactionCount(rawWallet.address);
  const feeData = await rawProvider.getFeeData();

  const tx = await rawWallet.sendTransaction({
    data: deployTx.data,
    nonce,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    gasLimit: deployTx.gasLimit ?? undefined,
    type: 2,
    chainId: 1,
  });

  console.log(`  Tx sent      : ${tx.hash}`);
  console.log(`  Waiting for 2 confirmations...`);

  const receipt = await rawProvider.waitForTransaction(tx.hash, 2, 600_000);
  if (!receipt || !receipt.contractAddress) {
    throw new Error(`${name} deployment failed — no contract address`);
  }
  if (receipt.status !== 1) {
    throw new Error(`${name} deployment reverted`);
  }
  return { address: receipt.contractAddress, txHash: tx.hash };
}

async function main() {
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();

  // Use raw provider for balance check too
  const rawProvider = new ethers.JsonRpcProvider(
    (hre.network.config as { url: string }).url
  );
  const balance = await rawProvider.getBalance(deployerAddress);

  console.log("=".repeat(60));
  console.log("  Trusted PayGram — Mainnet Deployment (resumed)");
  console.log("=".repeat(60));
  console.log(`  Network : ${hre.network.name} (chainId: ${hre.network.config.chainId})`);
  console.log(`  Deployer: ${deployerAddress}`);
  console.log(`  Balance : ${ethers.formatEther(balance)} ETH`);
  console.log("");

  console.log(`  [1/4] TrustScoring already deployed: ${TRUST_SCORING_ADDR}`);
  console.log(`  [2/4] PayGramToken already deployed: ${PAY_GRAM_TOKEN_ADDR}`);
  console.log("");

  // ── 3. PayGramCore ───────────────────────────────────────────
  console.log("  [3/4] Deploying PayGramCore...");
  const { address: payGramCoreAddr, txHash: coreTxHash } = await rawDeploy(
    "PayGramCore",
    [deployerAddress, deployerAddress, TRUST_SCORING_ADDR, PAY_GRAM_TOKEN_ADDR],
    signer
  );
  console.log(`  PayGramCore  : ${payGramCoreAddr}`);
  console.log("");

  // ── 4. Wire contracts together ───────────────────────────────
  console.log("  [4/4] Wiring contracts...");

  const rawWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, rawProvider);

  // 4a. setPayGramCore
  const tokenAbi = ["function payGramCore() view returns (address)", "function setPayGramCore(address)"];
  const tokenContract = new ethers.Contract(PAY_GRAM_TOKEN_ADDR, tokenAbi, rawWallet);
  const currentCore = await tokenContract.payGramCore();
  if (currentCore.toLowerCase() !== payGramCoreAddr.toLowerCase()) {
    const tx1 = await tokenContract.setPayGramCore(payGramCoreAddr);
    console.log(`  setPayGramCore tx: ${tx1.hash}`);
    await rawProvider.waitForTransaction(tx1.hash, 2, 600_000);
    console.log(`  PayGramToken.setPayGramCore -> ${payGramCoreAddr}`);
  } else {
    console.log(`  PayGramToken.payGramCore already set`);
  }

  // 4b. setOracle
  const trustAbi = ["function authorizedOracles(address) view returns (bool)", "function setOracle(address,bool)"];
  const trustContract = new ethers.Contract(TRUST_SCORING_ADDR, trustAbi, rawWallet);
  const isOracle = await trustContract.authorizedOracles(deployerAddress);
  if (!isOracle) {
    const tx2 = await trustContract.setOracle(deployerAddress, true);
    console.log(`  setOracle tx: ${tx2.hash}`);
    await rawProvider.waitForTransaction(tx2.hash, 2, 600_000);
    console.log(`  TrustScoring: deployer authorized as oracle`);
  } else {
    console.log(`  TrustScoring: deployer already authorized as oracle`);
  }
  console.log("");

  // ── 5. Export ────────────────────────────────────────────────
  const deployment = {
    network: "mainnet",
    chainId: 1,
    deployer: deployerAddress,
    contracts: {
      TrustScoring: TRUST_SCORING_ADDR,
      PayGramToken: PAY_GRAM_TOKEN_ADDR,
      PayGramCore: payGramCoreAddr,
    },
    transactions: {
      TrustScoring: TRUST_SCORING_TX,
      PayGramToken: PAY_GRAM_TOKEN_TX,
      PayGramCore: coreTxHash,
    },
    initialSupply: TOKEN_SUPPLY.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, "mainnet.json");
  fs.writeFileSync(outputFile, JSON.stringify(deployment, null, 2));
  console.log(`  Deployment saved to: ${outputFile}`);

  const endBalance = await rawProvider.getBalance(deployerAddress);
  const spent = balance - endBalance;

  console.log("");
  console.log("=".repeat(60));
  console.log("  DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`  TrustScoring : ${TRUST_SCORING_ADDR}`);
  console.log(`  PayGramToken : ${PAY_GRAM_TOKEN_ADDR}`);
  console.log(`  PayGramCore  : ${payGramCoreAddr}`);
  console.log(`  Supply minted: ${TOKEN_SUPPLY}`);
  console.log(`  Gas spent    : ${ethers.formatEther(spent)} ETH`);
  console.log(`  Balance left : ${ethers.formatEther(endBalance)} ETH`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
