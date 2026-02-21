import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as fs from "fs";
import * as path from "path";

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
    waitConfirmations: hre.network.name === "hardhat" ? 0 : 2,
  });
  log(`  TrustScoring deployed at: ${trustScoring.address}`);

  // ── 2. PayGramToken (cPAY) ───────────────────────────────────
  const initialSupply: bigint = 0n; // Mint separately after deployment
  const payGramToken = await deploy("PayGramToken", {
    from: deployer,
    args: [deployer, initialSupply],
    log: true,
    waitConfirmations: hre.network.name === "hardhat" ? 0 : 2,
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
    waitConfirmations: hre.network.name === "hardhat" ? 0 : 2,
  });
  log(`  PayGramCore  deployed at: ${payGramCore.address}`);

  // ── 4. Wire contracts together ───────────────────────────────

  // 4a. Set PayGramCore on PayGramToken
  const tokenContract = await hre.ethers.getContractAt(
    "PayGramToken",
    payGramToken.address
  );
  const currentCore = await tokenContract.payGramCore();
  if (currentCore !== payGramCore.address) {
    const tx1 = await tokenContract.setPayGramCore(payGramCore.address);
    await tx1.wait();
    log(`  PayGramToken.payGramCore set to ${payGramCore.address}`);
  } else {
    log(`  PayGramToken.payGramCore already configured`);
  }

  // 4b. Authorize deployer as oracle on TrustScoring
  const trustContract = await hre.ethers.getContractAt(
    "TrustScoring",
    trustScoring.address
  );
  const isDeployerOracle = await trustContract.authorizedOracles(deployer);
  if (!isDeployerOracle) {
    const tx2 = await trustContract.setOracle(deployer, true);
    await tx2.wait();
    log(`  TrustScoring: deployer authorized as oracle`);
  } else {
    log(`  TrustScoring: deployer already authorized as oracle`);
  }

  // ── 5. Export deployment addresses ───────────────────────────
  const addresses = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer,
    employer,
    contracts: {
      TrustScoring: trustScoring.address,
      PayGramToken: payGramToken.address,
      PayGramCore: payGramCore.address,
    },
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(
    outputDir,
    `addresses-${hre.network.name}.json`
  );
  fs.writeFileSync(outputFile, JSON.stringify(addresses, null, 2));
  log(`  Addresses exported to: ${outputFile}`);

  log("");
  log("  Deployment complete.");
  log("=".repeat(60));
};

deployAll.tags = ["all", "TrustScoring", "PayGramToken", "PayGramCore"];
export default deployAll;
