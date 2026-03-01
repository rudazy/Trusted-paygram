import { ethers } from "hardhat";
import hre from "hardhat";

// ── Sepolia Deployed Addresses ───────────────────────────────────────
const TRUST_SCORING = "0x458AA964DF9E6ae9F5B2Db33E1B395C10bbA263A";
const PAY_GRAM_TOKEN = "0xC97C848E7021AdFC36269ddc5e39E54939E81704";
const PAY_GRAM_CORE = "0x331048736e7dC599E46187CaBa00dcC46952a7d7";

// ── Test Employee Addresses (Hardhat default accounts) ───────────────
const EMPLOYEES = [
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    salary: 5000,
    role: "Senior Engineer",
    score: 85,
    label: "Employee 1 (HIGH trust — instant)",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    salary: 3000,
    role: "Product Manager",
    score: 55,
    label: "Employee 2 (MEDIUM trust — 24h delay)",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    salary: 2000,
    role: "Junior Developer",
    score: 25,
    label: "Employee 3 (LOW trust — escrow)",
  },
];

// ── ABIs (minimal interfaces for the calls we need) ──────────────────
const TRUST_ABI = [
  "function authorizedOracles(address) view returns (bool)",
  "function hasScore(address) view returns (bool)",
  "function setTrustScorePlaintext(address account, uint64 score)",
  "function totalScoredAddresses() view returns (uint256)",
];

const TOKEN_ABI = [
  "function mint(address to, uint64 amount)",
  "function totalMinted() view returns (uint64)",
  "function confidentialTransfer(address to, euint64 amount)",
  "function payGramCore() view returns (address)",
];

const CORE_ABI = [
  "function addEmployeePlaintext(address wallet, uint64 salary, string role)",
  "function getEmployeeList() view returns (address[])",
  "function employeeCount() view returns (uint256)",
  "function executePayroll()",
  "function totalPayrollsExecuted() view returns (uint256)",
  "function employer() view returns (address)",
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
      console.log(
        `        SUCCESS — block ${receipt.blockNumber}, gas: ${receipt.gasUsed}`
      );
      return {
        hash: tx.hash,
        gasUsed: receipt.gasUsed,
        status: receipt.status,
      };
    } else {
      console.log(
        `        REVERTED — block ${receipt.blockNumber}, gas: ${receipt.gasUsed}`
      );
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
  console.log("  Trusted PayGram — Sepolia Demo Seed");
  console.log("=".repeat(60));
  console.log(`  Network : ${hre.network.name} (chainId: ${hre.network.config.chainId})`);
  console.log(`  Deployer: ${deployer}`);
  console.log(`  Balance : ${ethers.formatEther(balance)} ETH`);
  console.log("");

  const trust = new ethers.Contract(TRUST_SCORING, TRUST_ABI, wallet);
  const token = new ethers.Contract(PAY_GRAM_TOKEN, TOKEN_ABI, wallet);
  const core = new ethers.Contract(PAY_GRAM_CORE, CORE_ABI, wallet);

  let totalGas = 0n;

  // ────────────────────────────────────────────────────────────────
  //  Step 1: Verify deployer is oracle
  // ────────────────────────────────────────────────────────────────
  console.log("  [1/7] Checking deployer is oracle on TrustScoring...");
  const isOracle = await trust.authorizedOracles(deployer);
  console.log(`        authorizedOracles(deployer): ${isOracle}`);
  if (!isOracle) {
    console.log("        ERROR: Deployer is not an oracle. Aborting.");
    process.exit(1);
  }
  console.log("        OK");
  console.log("");

  // ────────────────────────────────────────────────────────────────
  //  Step 2: Mint 100,000 cPAY tokens to the deployer
  // ────────────────────────────────────────────────────────────────
  console.log("  [2/7] Minting 100,000 cPAY to deployer...");
  const mintedBefore = await token.totalMinted();
  console.log(`        totalMinted before: ${mintedBefore}`);

  const mintResult = await sendAndWait(
    "mint",
    token.mint(deployer, 100_000),
    provider
  );
  if (mintResult) totalGas += mintResult.gasUsed;

  const mintedAfter = await token.totalMinted();
  console.log(`        totalMinted after: ${mintedAfter}`);
  console.log("");

  // ────────────────────────────────────────────────────────────────
  //  Step 3: Check deployer balance
  // ────────────────────────────────────────────────────────────────
  console.log("  [3/7] Checking deployer token balance...");
  console.log("        (balanceOf returns an encrypted handle on FHEVM,");
  console.log("         so we verify via totalMinted delta instead)");
  const mintDelta = BigInt(mintedAfter) - BigInt(mintedBefore);
  console.log(`        Minted this run: ${mintDelta} cPAY`);
  console.log("");

  // ────────────────────────────────────────────────────────────────
  //  Step 4: Add 3 test employees
  // ────────────────────────────────────────────────────────────────
  console.log("  [4/7] Adding 3 test employees to PayGramCore...");

  // Check existing employees first to avoid EmployeeAlreadyExists revert
  const existingList: string[] = await core.getEmployeeList();
  const existingSet = new Set(existingList.map((a: string) => a.toLowerCase()));

  for (const emp of EMPLOYEES) {
    console.log(`\n        ${emp.label}`);
    console.log(`        addr:   ${emp.address}`);
    console.log(`        salary: ${emp.salary} cPAY | role: "${emp.role}"`);

    if (existingSet.has(emp.address.toLowerCase())) {
      console.log("        SKIPPED — already registered");
      continue;
    }

    const result = await sendAndWait(
      `addEmployee(${emp.role})`,
      core.addEmployeePlaintext(emp.address, emp.salary, emp.role),
      provider
    );
    if (result) totalGas += result.gasUsed;
  }

  const empCount = await core.employeeCount();
  console.log(`\n        Total employees registered: ${empCount}`);
  console.log("");

  // ────────────────────────────────────────────────────────────────
  //  Step 5: Set trust scores
  // ────────────────────────────────────────────────────────────────
  console.log("  [5/7] Setting trust scores via setTrustScorePlaintext...");

  for (const emp of EMPLOYEES) {
    console.log(`\n        ${emp.label}`);

    const alreadyScored = await trust.hasScore(emp.address);
    if (alreadyScored) {
      console.log(`        SKIPPED — already has a score`);
      continue;
    }

    const result = await sendAndWait(
      `setTrustScore(${emp.score})`,
      trust.setTrustScorePlaintext(emp.address, emp.score),
      provider
    );
    if (result) totalGas += result.gasUsed;
  }

  const totalScored = await trust.totalScoredAddresses();
  console.log(`\n        Total scored addresses: ${totalScored}`);
  console.log("");

  // ────────────────────────────────────────────────────────────────
  //  Step 6: Fund PayGramCore with tokens
  // ────────────────────────────────────────────────────────────────
  console.log("  [6/7] Funding PayGramCore with tokens...");
  console.log("        PayGramCore transfers from its own balance,");
  console.log("        so we send cPAY to the contract via confidentialTransfer.");
  console.log("        This requires FHE — minting directly to the contract instead.");
  console.log("");

  // Mint tokens directly to PayGramCore (avoids needing a confidentialTransfer)
  console.log("        Minting 50,000 cPAY directly to PayGramCore...");
  const fundResult = await sendAndWait(
    "mint-to-core",
    token.mint(PAY_GRAM_CORE, 50_000),
    provider
  );
  if (fundResult) totalGas += fundResult.gasUsed;
  console.log("");

  // ────────────────────────────────────────────────────────────────
  //  Step 7: Execute payroll
  // ────────────────────────────────────────────────────────────────
  console.log("  [7/7] Executing payroll...");
  console.log("        This routes payments by trust tier using FHE:");
  console.log("          HIGH (85)  → instant confidentialTransfer");
  console.log("          MEDIUM (55) → 24h delayed payment record");
  console.log("          LOW (25)   → escrow payment record");
  console.log("");

  const payrollsBefore = await core.totalPayrollsExecuted();
  console.log(`        payrolls executed before: ${payrollsBefore}`);

  const payrollResult = await sendAndWait(
    "executePayroll",
    core.executePayroll(),
    provider
  );
  if (payrollResult) totalGas += payrollResult.gasUsed;

  const payrollsAfter = await core.totalPayrollsExecuted();
  console.log(`        payrolls executed after: ${payrollsAfter}`);
  console.log("");

  // ────────────────────────────────────────────────────────────────
  //  Summary
  // ────────────────────────────────────────────────────────────────
  const endBalance = await provider.getBalance(deployer);
  const ethSpent = balance - endBalance;

  console.log("=".repeat(60));
  console.log("  SEED COMPLETE");
  console.log("=".repeat(60));
  console.log(`  Employees added : ${empCount}`);
  console.log(`  Scores set      : ${totalScored}`);
  console.log(`  Tokens minted   : ${mintDelta + 50000n} cPAY`);
  console.log(`  Payrolls run    : ${payrollsAfter}`);
  console.log(`  Total gas used  : ${totalGas}`);
  console.log(`  ETH spent       : ${ethers.formatEther(ethSpent)} ETH`);
  console.log(`  Balance left    : ${ethers.formatEther(endBalance)} ETH`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  });
