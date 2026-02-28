import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as fs from "fs";
import * as path from "path";

const INITIAL_SUPPLY: bigint = 1_000_000n; // 1M cPAY tokens

const deployAll: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const isLive = hre.network.name !== "hardhat" && hre.network.name !== "localhost";
  const confirmations = isLive ? 2 : 0;

  log("=".repeat(60));
  log("  Trusted PayGram — Deployment");
  log("=".repeat(60));
  log(`  Network : ${hre.network.name} (chainId: ${hre.network.config.chainId})`);
  log(`  Deployer: ${deployer}`);
  log(`  Deployer is also the employer for this deployment`);
  log("");

  // ── 1. TrustScoring ──────────────────────────────────────────
  log("  [1/4] Deploying TrustScoring...");
  const trustScoring = await deploy("TrustScoring", {
    from: deployer,
    args: [deployer],
    log: true,
    waitConfirmations: confirmations,
  });
  log(`  TrustScoring deployed at: ${trustScoring.address}`);
  if (trustScoring.transactionHash) {
    log(`  Tx: ${trustScoring.transactionHash}`);
  }
  log("");

  // ── 2. PayGramToken (cPAY) ───────────────────────────────────
  // On networks with Zama coprocessor, we can mint in constructor.
  // On standard networks, deploy with 0 supply and mint later.
  let tokenSupply = INITIAL_SUPPLY;
  log(`  [2/4] Deploying PayGramToken (supply: ${tokenSupply})...`);

  let payGramToken;
  try {
    payGramToken = await deploy("PayGramToken", {
      from: deployer,
      args: [deployer, tokenSupply],
      log: true,
      waitConfirmations: confirmations,
    });
  } catch (err) {
    // FHE coprocessor may not be available — retry with 0 supply
    log(`  Initial supply mint failed (FHE coprocessor may be unavailable).`);
    log(`  Retrying with initialSupply = 0...`);
    tokenSupply = 0n;
    payGramToken = await deploy("PayGramToken", {
      from: deployer,
      args: [deployer, tokenSupply],
      log: true,
      waitConfirmations: confirmations,
    });
  }
  log(`  PayGramToken deployed at: ${payGramToken.address}`);
  if (payGramToken.transactionHash) {
    log(`  Tx: ${payGramToken.transactionHash}`);
  }
  log("");

  // ── 3. PayGramCore ───────────────────────────────────────────
  log("  [3/4] Deploying PayGramCore...");
  const payGramCore = await deploy("PayGramCore", {
    from: deployer,
    args: [
      deployer,               // initialOwner
      deployer,               // employer (same as deployer)
      trustScoring.address,   // TrustScoring contract
      payGramToken.address,   // PayGramToken (ERC-7984)
    ],
    log: true,
    waitConfirmations: confirmations,
  });
  log(`  PayGramCore deployed at: ${payGramCore.address}`);
  if (payGramCore.transactionHash) {
    log(`  Tx: ${payGramCore.transactionHash}`);
  }
  log("");

  // ── 4. Wire contracts together ───────────────────────────────
  log("  [4/4] Wiring contracts...");

  // 4a. Set PayGramCore on PayGramToken
  const tokenContract = await hre.ethers.getContractAt(
    "PayGramToken",
    payGramToken.address
  );
  const currentCore = await tokenContract.payGramCore();
  if (currentCore !== payGramCore.address) {
    const tx1 = await tokenContract.setPayGramCore(payGramCore.address);
    const receipt1 = await tx1.wait();
    log(`  PayGramToken.setPayGramCore -> ${payGramCore.address}`);
    log(`  Tx: ${receipt1?.hash}`);
  } else {
    log(`  PayGramToken.payGramCore already set`);
  }

  // 4b. Authorize deployer as oracle on TrustScoring
  const trustContract = await hre.ethers.getContractAt(
    "TrustScoring",
    trustScoring.address
  );
  const isDeployerOracle = await trustContract.authorizedOracles(deployer);
  if (!isDeployerOracle) {
    const tx2 = await trustContract.setOracle(deployer, true);
    const receipt2 = await tx2.wait();
    log(`  TrustScoring: deployer authorized as oracle`);
    log(`  Tx: ${receipt2?.hash}`);
  } else {
    log(`  TrustScoring: deployer already authorized as oracle`);
  }
  log("");

  // ── 5. Export deployment addresses ───────────────────────────
  const addresses = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer,
    contracts: {
      TrustScoring: trustScoring.address,
      PayGramToken: payGramToken.address,
      PayGramCore: payGramCore.address,
    },
    initialSupply: tokenSupply.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(outputDir, `${hre.network.name}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(addresses, null, 2));
  log(`  Addresses exported to: ${outputFile}`);

  log("");
  log("  Deployment complete.");
  log("=".repeat(60));
  log("");
  log("  Summary:");
  log(`    TrustScoring : ${trustScoring.address}`);
  log(`    PayGramToken : ${payGramToken.address}`);
  log(`    PayGramCore  : ${payGramCore.address}`);
  log("=".repeat(60));
};

deployAll.tags = ["all", "TrustScoring", "PayGramToken", "PayGramCore"];
export default deployAll;
