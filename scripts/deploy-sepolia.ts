import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

const INITIAL_SUPPLY = 1_000_000n; // 1M cPAY tokens

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("=".repeat(60));
  console.log("  Trusted PayGram — Sepolia Deployment");
  console.log("=".repeat(60));
  console.log(`  Network : ${hre.network.name} (chainId: ${hre.network.config.chainId})`);
  console.log(`  Deployer: ${deployerAddress}`);
  console.log(`  Balance : ${ethers.formatEther(balance)} ETH`);
  console.log(`  Deployer is also the employer for this deployment`);
  console.log("");

  // ── 1. TrustScoring ──────────────────────────────────────────
  console.log("  [1/4] Deploying TrustScoring...");
  const TrustScoring = await ethers.getContractFactory("TrustScoring");
  const trustScoring = await TrustScoring.deploy(deployerAddress);
  await trustScoring.waitForDeployment();
  const trustScoringAddr = await trustScoring.getAddress();
  const trustScoringTx = trustScoring.deploymentTransaction();
  console.log(`  TrustScoring : ${trustScoringAddr}`);
  console.log(`  Tx           : ${trustScoringTx?.hash}`);
  // Wait for 2 confirmations for block propagation
  if (trustScoringTx) await trustScoringTx.wait(2);
  console.log("");

  // ── 2. PayGramToken (cPAY) ───────────────────────────────────
  let tokenSupply = INITIAL_SUPPLY;
  console.log(`  [2/4] Deploying PayGramToken (supply: ${tokenSupply})...`);

  const PayGramToken = await ethers.getContractFactory("PayGramToken");
  let payGramToken;
  try {
    payGramToken = await PayGramToken.deploy(deployerAddress, tokenSupply);
    await payGramToken.waitForDeployment();
  } catch (err) {
    // FHE coprocessor may not accept trivialEncrypt — retry with 0
    console.log(`  Initial supply mint failed. Retrying with supply = 0...`);
    console.log(`  Reason: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
    tokenSupply = 0n;
    payGramToken = await PayGramToken.deploy(deployerAddress, tokenSupply);
    await payGramToken.waitForDeployment();
  }
  const payGramTokenAddr = await payGramToken.getAddress();
  const tokenTx = payGramToken.deploymentTransaction();
  console.log(`  PayGramToken : ${payGramTokenAddr}`);
  console.log(`  Tx           : ${tokenTx?.hash}`);
  if (tokenTx) await tokenTx.wait(2);
  console.log("");

  // ── 3. PayGramCore ───────────────────────────────────────────
  console.log("  [3/4] Deploying PayGramCore...");
  const PayGramCore = await ethers.getContractFactory("PayGramCore");
  const payGramCore = await PayGramCore.deploy(
    deployerAddress,    // initialOwner
    deployerAddress,    // employer (same as deployer)
    trustScoringAddr,   // TrustScoring
    payGramTokenAddr    // PayGramToken
  );
  await payGramCore.waitForDeployment();
  const payGramCoreAddr = await payGramCore.getAddress();
  const coreTx = payGramCore.deploymentTransaction();
  console.log(`  PayGramCore  : ${payGramCoreAddr}`);
  console.log(`  Tx           : ${coreTx?.hash}`);
  if (coreTx) await coreTx.wait(2);
  console.log("");

  // ── 4. Wire contracts together ───────────────────────────────
  console.log("  [4/4] Wiring contracts...");

  // 4a. Set PayGramCore on PayGramToken
  const currentCore = await payGramToken.payGramCore();
  if (currentCore !== payGramCoreAddr) {
    const tx1 = await payGramToken.setPayGramCore(payGramCoreAddr);
    const receipt1 = await tx1.wait(2);
    console.log(`  PayGramToken.setPayGramCore -> ${payGramCoreAddr}`);
    console.log(`  Tx: ${receipt1?.hash}`);
  } else {
    console.log(`  PayGramToken.payGramCore already set`);
  }

  // 4b. Authorize deployer as oracle on TrustScoring
  const isOracle = await trustScoring.authorizedOracles(deployerAddress);
  if (!isOracle) {
    const tx2 = await trustScoring.setOracle(deployerAddress, true);
    const receipt2 = await tx2.wait(2);
    console.log(`  TrustScoring: deployer authorized as oracle`);
    console.log(`  Tx: ${receipt2?.hash}`);
  } else {
    console.log(`  TrustScoring: deployer already authorized as oracle`);
  }
  console.log("");

  // ── 5. Export deployment addresses ───────────────────────────
  const deployment = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployerAddress,
    contracts: {
      TrustScoring: trustScoringAddr,
      PayGramToken: payGramTokenAddr,
      PayGramCore: payGramCoreAddr,
    },
    transactions: {
      TrustScoring: trustScoringTx?.hash,
      PayGramToken: tokenTx?.hash,
      PayGramCore: coreTx?.hash,
    },
    initialSupply: tokenSupply.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(outputDir, "sepolia.json");
  fs.writeFileSync(outputFile, JSON.stringify(deployment, null, 2));
  console.log(`  Deployment saved to: ${outputFile}`);

  // Final balance
  const endBalance = await ethers.provider.getBalance(deployerAddress);
  const spent = balance - endBalance;

  console.log("");
  console.log("=".repeat(60));
  console.log("  DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`  TrustScoring : ${trustScoringAddr}`);
  console.log(`  PayGramToken : ${payGramTokenAddr}`);
  console.log(`  PayGramCore  : ${payGramCoreAddr}`);
  console.log(`  Supply minted: ${tokenSupply}`);
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
