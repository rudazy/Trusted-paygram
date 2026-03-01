import { ethers } from "hardhat";
import hre from "hardhat";

const TRUST_SCORING_ADDR = "0xaa3ae25ebac250ff67f4d9e3195c4c7610055067";

async function main() {
  const rawProvider = new ethers.JsonRpcProvider(
    (hre.network.config as { url: string }).url
  );
  const rawWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, rawProvider);
  const deployer = rawWallet.address;

  const balance = await rawProvider.getBalance(deployer);

  console.log("=".repeat(60));
  console.log("  Trusted PayGram — Mainnet FHE Test");
  console.log("=".repeat(60));
  console.log(`  Network : ${hre.network.name} (chainId: ${hre.network.config.chainId})`);
  console.log(`  Deployer: ${deployer}`);
  console.log(`  Balance : ${ethers.formatEther(balance)} ETH`);
  console.log(`  Contract: ${TRUST_SCORING_ADDR}`);
  console.log("");

  const trustAbi = [
    "function setTrustScorePlaintext(address account, uint64 score)",
    "function hasScore(address account) view returns (bool)",
    "function authorizedOracles(address) view returns (bool)",
  ];
  const trust = new ethers.Contract(TRUST_SCORING_ADDR, trustAbi, rawWallet);

  // ── Pre-flight checks ──────────────────────────────────────────
  const isOracle = await trust.authorizedOracles(deployer);
  console.log(`  [check] deployer is oracle: ${isOracle}`);

  const hadScoreBefore = await trust.hasScore(deployer);
  console.log(`  [check] hasScore(deployer) before: ${hadScoreBefore}`);
  console.log("");

  // ── Call setTrustScorePlaintext(deployer, 85) ──────────────────
  console.log("  [1/2] Calling setTrustScorePlaintext(deployer, 85)...");
  console.log("        This calls FHE.asEuint64(85) internally.");
  console.log("");

  try {
    const tx = await trust.setTrustScorePlaintext(deployer, 85);
    console.log(`  Tx hash: ${tx.hash}`);
    console.log(`  Etherscan: https://etherscan.io/tx/${tx.hash}`);
    console.log("  Waiting for confirmation...");

    const receipt = await rawProvider.waitForTransaction(tx.hash, 1, 300_000);
    if (!receipt) {
      console.log("  WARNING: No receipt returned (timeout)");
    } else if (receipt.status === 1) {
      console.log(`  SUCCESS — block ${receipt.blockNumber}, gas used: ${receipt.gasUsed}`);
    } else {
      console.log(`  REVERTED — block ${receipt.blockNumber}, gas used: ${receipt.gasUsed}`);
    }
  } catch (err: unknown) {
    const error = err as Error & { reason?: string; code?: string };
    console.log(`  FAILED: ${error.reason ?? error.message}`);
    console.log(`  Code: ${error.code ?? "unknown"}`);
    console.log("");
    console.log("  NOTE: FHE.asEuint64() calls the TFHEExecutor coprocessor.");
    console.log("  On mainnet (chainId 1) the coprocessor is at address(0),");
    console.log("  so any FHE operation reverts. FHE is only live on Sepolia.");
  }
  console.log("");

  // ── Call hasScore(deployer) — this is a plain view, always works ─
  console.log("  [2/2] Calling hasScore(deployer)...");
  const hasScoreAfter = await trust.hasScore(deployer);
  console.log(`  hasScore(deployer) after: ${hasScoreAfter}`);

  console.log("");
  console.log("=".repeat(60));
  console.log("  TEST COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
