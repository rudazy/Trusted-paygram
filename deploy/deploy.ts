import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployAll: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer, employer } = await getNamedAccounts();

  log("=".repeat(60));
  log("  Trusted PayGram — Deployment");
  log("=".repeat(60));
  log(`  Network : ${hre.network.name}`);
  log(`  Deployer: ${deployer}`);
  log(`  Employer: ${employer}`);
  log("");

  // ── 1. TrustScoring ──────────────────────────────────────────
  const trustScoring = await deploy("TrustScoring", {
    from: deployer,
    args: [deployer],
    log: true,
    waitConfirmations: hre.network.name === "localhost" ? 0 : 2,
  });
  log(`  TrustScoring deployed at: ${trustScoring.address}`);

  // ── 2. PayGramToken (cPAY) ───────────────────────────────────
  const initialSupply: bigint = 10_000_000n; // 10 M cPAY
  const payGramToken = await deploy("PayGramToken", {
    from: deployer,
    args: [deployer, initialSupply],
    log: true,
    waitConfirmations: hre.network.name === "localhost" ? 0 : 2,
  });
  log(`  PayGramToken deployed at: ${payGramToken.address}`);

  // ── 3. PayGramCore ───────────────────────────────────────────
  const payGramCore = await deploy("PayGramCore", {
    from: deployer,
    args: [
      deployer,
      employer,
      trustScoring.address,
      payGramToken.address,
    ],
    log: true,
    waitConfirmations: hre.network.name === "localhost" ? 0 : 2,
  });
  log(`  PayGramCore  deployed at: ${payGramCore.address}`);

  // ── 4. Wire contracts together ───────────────────────────────
  const tokenContract = await hre.ethers.getContractAt(
    "PayGramToken",
    payGramToken.address
  );
  const currentCore = await tokenContract.payGramCore();
  if (currentCore === hre.ethers.ZeroAddress) {
    const tx = await tokenContract.setPayGramCore(payGramCore.address);
    await tx.wait();
    log(`  PayGramToken.payGramCore set to ${payGramCore.address}`);
  } else {
    log(`  PayGramToken.payGramCore already configured`);
  }

  log("");
  log("  Deployment complete.");
  log("=".repeat(60));
};

deployAll.tags = ["all", "TrustScoring", "PayGramToken", "PayGramCore"];
export default deployAll;
