import { ethers } from "hardhat";
import hre from "hardhat";

// ── Contract Addresses ───────────────────────────────────────────────
const TRUST_SCORING = "0x458AA964DF9E6ae9F5B2Db33E1B395C10bbA263A";
const PAY_GRAM_CORE = "0x331048736e7dC599E46187CaBa00dcC46952a7d7";

// ── Employee ─────────────────────────────────────────────────────────
const EMPLOYEE = "0xCbdE65F69574C94f0c3Ba7927E3D5Eb7d921FfEd";
const SALARY = 5000;
const ROLE = "Senior Engineer";
const TRUST_SCORE = 85;

// ── Minimal ABIs ─────────────────────────────────────────────────────
const CORE_ABI = [
  "function addEmployeePlaintext(address wallet, uint64 salary, string role)",
  "function getEmployee(address wallet) view returns (address, bool, uint256, uint256, string)",
];

const TRUST_ABI = [
  "function setTrustScorePlaintext(address account, uint64 score)",
  "function allowScoreAccess(address account, address allowedAddress)",
  "function hasScore(address) view returns (bool)",
];

async function sendAndWait(
  label: string,
  txPromise: Promise<ethers.TransactionResponse>,
  provider: ethers.JsonRpcProvider
) {
  console.log(`\n  ${label}`);
  const tx = await txPromise;
  console.log(`    tx: ${tx.hash}`);
  console.log(`    https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log("    waiting for confirmation...");

  const receipt = await provider.waitForTransaction(tx.hash, 1, 300_000);
  if (!receipt) {
    console.log("    TIMEOUT — no receipt");
    process.exit(1);
  }
  if (receipt.status !== 1) {
    console.log(`    REVERTED — block ${receipt.blockNumber}, gas: ${receipt.gasUsed}`);
    process.exit(1);
  }
  console.log(`    SUCCESS — block ${receipt.blockNumber}, gas: ${receipt.gasUsed}`);
  return receipt;
}

async function main() {
  const rpcUrl = (hre.network.config as { url: string }).url;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const deployer = wallet.address;
  const balance = await provider.getBalance(deployer);

  console.log("=".repeat(60));
  console.log("  Trusted PayGram — Add Real Employee");
  console.log("=".repeat(60));
  console.log(`  Network : ${hre.network.name}`);
  console.log(`  Deployer: ${deployer}`);
  console.log(`  Balance : ${ethers.formatEther(balance)} ETH`);
  console.log(`  Employee: ${EMPLOYEE}`);
  console.log(`  Salary  : ${SALARY} cPAY | Role: "${ROLE}" | Score: ${TRUST_SCORE}`);

  const core = new ethers.Contract(PAY_GRAM_CORE, CORE_ABI, wallet);
  const trust = new ethers.Contract(TRUST_SCORING, TRUST_ABI, wallet);

  // ── Step 1: Add employee to PayGramCore ────────────────────────
  await sendAndWait(
    `[1/3] PayGramCore.addEmployeePlaintext(${EMPLOYEE}, ${SALARY}, "${ROLE}")`,
    core.addEmployeePlaintext(EMPLOYEE, SALARY, ROLE) as Promise<ethers.TransactionResponse>,
    provider
  );

  // ── Step 2: Set trust score ────────────────────────────────────
  await sendAndWait(
    `[2/3] TrustScoring.setTrustScorePlaintext(${EMPLOYEE}, ${TRUST_SCORE})`,
    trust.setTrustScorePlaintext(EMPLOYEE, TRUST_SCORE) as Promise<ethers.TransactionResponse>,
    provider
  );

  // ── Step 3: Grant PayGramCore ACL access to the score ──────────
  await sendAndWait(
    `[3/3] TrustScoring.allowScoreAccess(${EMPLOYEE}, ${PAY_GRAM_CORE})`,
    trust.allowScoreAccess(EMPLOYEE, PAY_GRAM_CORE) as Promise<ethers.TransactionResponse>,
    provider
  );

  // ── Verify ─────────────────────────────────────────────────────
  const [empWallet, isActive, , , role] = await core.getEmployee(EMPLOYEE);
  const hasScore = await trust.hasScore(EMPLOYEE);
  const endBalance = await provider.getBalance(deployer);

  console.log("\n" + "=".repeat(60));
  console.log("  DONE");
  console.log("=".repeat(60));
  console.log(`  Employee : ${empWallet}`);
  console.log(`  Active   : ${isActive}`);
  console.log(`  Role     : ${role}`);
  console.log(`  Scored   : ${hasScore}`);
  console.log(`  ETH spent: ${ethers.formatEther(balance - endBalance)} ETH`);
  console.log(`  Balance  : ${ethers.formatEther(endBalance)} ETH`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
