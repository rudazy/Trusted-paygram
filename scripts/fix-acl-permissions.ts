import { ethers } from "hardhat";
import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ── Existing Sepolia Addresses (unchanged) ───────────────────────────
const PAY_GRAM_TOKEN = "0xC97C848E7021AdFC36269ddc5e39E54939E81704";
const PAY_GRAM_CORE  = "0x331048736e7dC599E46187CaBa00dcC46952a7d7";

// ── Test Employees ───────────────────────────────────────────────────
const EMPLOYEES = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", score: 85, label: "Employee 1 (HIGH)" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", score: 55, label: "Employee 2 (MEDIUM)" },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", score: 25, label: "Employee 3 (LOW)" },
];

// ── Minimal ABIs ─────────────────────────────────────────────────────
const CORE_ABI = [
  "function updateTrustScoring(address newTrustScoring)",
  "function trustScoring() view returns (address)",
  "function executePayroll()",
  "function totalPayrollsExecuted() view returns (uint256)",
  "function employer() view returns (address)",
];

const TRUST_ABI = [
  "function setOracle(address oracle, bool authorized)",
  "function authorizedOracles(address) view returns (bool)",
  "function setTrustScorePlaintext(address account, uint64 score)",
  "function hasScore(address) view returns (bool)",
  "function totalScoredAddresses() view returns (uint256)",
  "function allowScoreAccess(address account, address allowedAddress)",
];

interface TxResult {
  hash: string;
  gasUsed: bigint;
  status: number;
}

async function sendAndWait(
  label: string,
  txPromise: Promise<ethers.TransactionResponse>,
  provider: ethers.JsonRpcProvider
): Promise<TxResult | null> {
  try {
    const tx = await txPromise;
    console.log(`        tx: ${tx.hash}`);
    console.log(`        https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log("        waiting for confirmation...");

    const receipt = await provider.waitForTransaction(tx.hash, 1, 300_000);
    if (!receipt) {
      console.log("        TIMEOUT — no receipt");
      return null;
    }
    if (receipt.status === 1) {
      console.log(`        SUCCESS — block ${receipt.blockNumber}, gas: ${receipt.gasUsed}`);
      return { hash: tx.hash, gasUsed: receipt.gasUsed, status: 1 };
    } else {
      console.log(`        REVERTED — block ${receipt.blockNumber}, gas: ${receipt.gasUsed}`);
      return { hash: tx.hash, gasUsed: receipt.gasUsed, status: 0 };
    }
  } catch (err: unknown) {
    const error = err as Error & { reason?: string; code?: string };
    console.log(`        FAILED: ${error.reason ?? error.message}`);
    console.log(`        Code: ${error.code ?? "unknown"}`);
    return null;
  }
}

async function main() {
  const rpcUrl = (hre.network.config as { url: string }).url;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const deployer = wallet.address;

  const balance = await provider.getBalance(deployer);

  console.log("=".repeat(60));
  console.log("  Trusted PayGram — Fix FHE ACL Permissions");
  console.log("=".repeat(60));
  console.log(`  Network : ${hre.network.name} (chainId: ${hre.network.config.chainId})`);
  console.log(`  Deployer: ${deployer}`);
  console.log(`  Balance : ${ethers.formatEther(balance)} ETH`);
  console.log("");

  let totalGas = 0n;

  // ── Step 1: Redeploy TrustScoring with FHE.allowTransient fix ──
  console.log("  [1/6] Deploying new TrustScoring (with allowTransient fix)...");

  const TrustScoring = await ethers.getContractFactory("TrustScoring", wallet);
  const deployTx = await TrustScoring.getDeployTransaction(deployer);
  const sentTx = await wallet.sendTransaction(deployTx);
  console.log(`        tx: ${sentTx.hash}`);
  console.log(`        https://sepolia.etherscan.io/tx/${sentTx.hash}`);
  console.log("        waiting for confirmation...");

  const deployReceipt = await provider.waitForTransaction(sentTx.hash, 2, 300_000);
  if (!deployReceipt || deployReceipt.status !== 1) {
    console.log("        DEPLOYMENT FAILED");
    process.exit(1);
  }
  const newTrustScoringAddr = deployReceipt.contractAddress!;
  totalGas += deployReceipt.gasUsed;
  console.log(`        NEW TrustScoring: ${newTrustScoringAddr}`);
  console.log(`        Gas: ${deployReceipt.gasUsed}`);
  console.log("");

  const newTrust = new ethers.Contract(newTrustScoringAddr, TRUST_ABI, wallet);

  // ── Step 2: Authorize deployer as oracle ───────────────────────
  console.log("  [2/6] Authorizing deployer as oracle on new TrustScoring...");
  const oracleResult = await sendAndWait(
    "setOracle",
    newTrust.setOracle(deployer, true) as Promise<ethers.TransactionResponse>,
    provider
  );
  if (oracleResult) totalGas += oracleResult.gasUsed;
  console.log("");

  // ── Step 3: Re-set trust scores ────────────────────────────────
  console.log("  [3/6] Setting trust scores on new TrustScoring...");

  for (const emp of EMPLOYEES) {
    console.log(`\n        ${emp.label}: score=${emp.score}`);
    const result = await sendAndWait(
      `setTrustScorePlaintext(${emp.score})`,
      newTrust.setTrustScorePlaintext(emp.address, emp.score) as Promise<ethers.TransactionResponse>,
      provider
    );
    if (result) totalGas += result.gasUsed;
  }

  const totalScored = await newTrust.totalScoredAddresses();
  console.log(`\n        Total scored: ${totalScored}`);
  console.log("");

  // ── Step 4: Grant PayGramCore access to each score ─────────────
  console.log("  [4/6] Granting PayGramCore FHE access to trust scores...");

  for (const emp of EMPLOYEES) {
    console.log(`\n        ${emp.label} → allowScoreAccess → PayGramCore`);
    const result = await sendAndWait(
      `allowScoreAccess(${emp.label})`,
      newTrust.allowScoreAccess(emp.address, PAY_GRAM_CORE) as Promise<ethers.TransactionResponse>,
      provider
    );
    if (result) totalGas += result.gasUsed;
  }
  console.log("");

  // ── Step 5: Update PayGramCore to use new TrustScoring ─────────
  console.log("  [5/6] Updating PayGramCore.trustScoring → new address...");

  const core = new ethers.Contract(PAY_GRAM_CORE, CORE_ABI, wallet);
  const currentTrust = await core.trustScoring();
  console.log(`        Current TrustScoring: ${currentTrust}`);
  console.log(`        New TrustScoring:     ${newTrustScoringAddr}`);

  const updateResult = await sendAndWait(
    "updateTrustScoring",
    core.updateTrustScoring(newTrustScoringAddr) as Promise<ethers.TransactionResponse>,
    provider
  );
  if (updateResult) totalGas += updateResult.gasUsed;

  const verifiedTrust = await core.trustScoring();
  console.log(`        Verified: ${verifiedTrust}`);
  console.log("");

  // ── Step 6: Retry executePayroll ───────────────────────────────
  console.log("  [6/6] Executing payroll (should succeed with ACL fix)...");

  const payrollsBefore = await core.totalPayrollsExecuted();
  console.log(`        payrolls before: ${payrollsBefore}`);

  const payrollResult = await sendAndWait(
    "executePayroll",
    core.executePayroll() as Promise<ethers.TransactionResponse>,
    provider
  );
  if (payrollResult) totalGas += payrollResult.gasUsed;

  const payrollsAfter = await core.totalPayrollsExecuted();
  console.log(`        payrolls after: ${payrollsAfter}`);
  console.log("");

  // ── Summary ────────────────────────────────────────────────────
  const endBalance = await provider.getBalance(deployer);
  const ethSpent = balance - endBalance;

  console.log("=".repeat(60));
  console.log("  FHE ACL FIX COMPLETE");
  console.log("=".repeat(60));
  console.log(`  New TrustScoring : ${newTrustScoringAddr}`);
  console.log(`  PayGramCore      : ${PAY_GRAM_CORE} (unchanged)`);
  console.log(`  PayGramToken     : ${PAY_GRAM_TOKEN} (unchanged)`);
  console.log(`  Scores re-set    : ${totalScored}`);
  console.log(`  Payrolls run     : ${payrollsAfter}`);
  console.log(`  Total gas        : ${totalGas}`);
  console.log(`  ETH spent        : ${ethers.formatEther(ethSpent)} ETH`);
  console.log(`  Balance left     : ${ethers.formatEther(endBalance)} ETH`);
  console.log("");
  console.log("  NEXT STEPS:");
  console.log(`  1. Verify on Etherscan:`);
  console.log(`     npx hardhat verify --network sepolia ${newTrustScoringAddr} ${deployer}`);
  console.log(`  2. Update frontend/src/lib/constants.ts with new TrustScoring address`);
  console.log(`  3. Copy new ABI: artifacts/contracts/TrustScoring.sol/TrustScoring.json`);
  console.log("=".repeat(60));

  // Save new address to file for easy reference
  const outputDir = path.resolve(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(outputDir, "sepolia-acl-fix.json");
  fs.writeFileSync(outputFile, JSON.stringify({
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    fix: "FHE ACL allowTransient for tier checks",
    newTrustScoring: newTrustScoringAddr,
    payGramCore: PAY_GRAM_CORE,
    payGramToken: PAY_GRAM_TOKEN,
    fixedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`  Deployment saved to: ${outputFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fix script failed:", error);
    process.exit(1);
  });
