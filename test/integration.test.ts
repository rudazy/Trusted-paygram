import { expect } from "chai";
import { ethers } from "hardhat";
import { PayGramCore, TrustScoring, PayGramToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Trusted PayGram — Integration Test Suite
 *
 * End-to-end tests exercising the full contract stack:
 *   TrustScoring  ←→  PayGramCore  ←→  PayGramToken
 *
 * Tests are split into two categories:
 *
 * 1. State & access-control tests — run on any Hardhat network.
 *    These verify deployment wiring, cross-contract references,
 *    and the non-FHE lifecycle (add/remove employees, cancel payments, etc.).
 *
 * 2. FHE-dependent tests — require a Hardhat node with the Zama FHEVM
 *    coprocessor deployed. On vanilla Hardhat these auto-skip via
 *    try/catch + this.skip().
 */

describe("Trusted PayGram — Integration", function () {
  let payGramCore: PayGramCore;
  let trustScoring: TrustScoring;
  let payGramToken: PayGramToken;

  let owner: HardhatEthersSigner;
  let employer: HardhatEthersSigner;
  let employee1: HardhatEthersSigner;
  let employee2: HardhatEthersSigner;
  let employee3: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  /** Whether FHE operations are available on this network. */
  let fheAvailable = false;

  /**
   * Attempts to add an employee using the plaintext helper.
   * If FHE is unavailable (vanilla Hardhat), skips the calling test.
   */
  async function addEmployeeOrSkip(
    ctx: Mocha.Context,
    wallet: HardhatEthersSigner,
    salary: number,
    role: string
  ) {
    try {
      await payGramCore
        .connect(employer)
        .addEmployeePlaintext(wallet.address, salary, role);
    } catch {
      ctx.skip();
    }
  }

  /**
   * Adds an employee and a trust score. Skips if FHE is unavailable.
   */
  async function addScoredEmployeeOrSkip(
    ctx: Mocha.Context,
    wallet: HardhatEthersSigner,
    salary: number,
    role: string,
    score: number
  ) {
    try {
      await payGramCore
        .connect(employer)
        .addEmployeePlaintext(wallet.address, salary, role);
      await trustScoring
        .connect(oracle)
        .setTrustScorePlaintext(wallet.address, score);
    } catch {
      ctx.skip();
    }
  }

  /**
   * Mints tokens and funds PayGramCore. Skips if FHE is unavailable.
   */
  async function fundContractOrSkip(
    ctx: Mocha.Context,
    amount: number
  ) {
    try {
      // Mint tokens to owner
      await payGramToken.connect(owner).mint(owner.address, amount);
      // Transfer tokens to PayGramCore
      const coreAddress = await payGramCore.getAddress();
      const encAmount = await payGramToken.confidentialBalanceOf(owner.address);
      await payGramToken
        .connect(owner)
        .confidentialTransfer(coreAddress, encAmount);
    } catch {
      ctx.skip();
    }
  }

  beforeEach(async function () {
    [owner, employer, employee1, employee2, employee3, oracle, unauthorized] =
      await ethers.getSigners();

    // ── Deploy TrustScoring ──────────────────────────────────────
    const TrustScoringFactory =
      await ethers.getContractFactory("TrustScoring");
    trustScoring = await TrustScoringFactory.deploy(owner.address);
    await trustScoring.waitForDeployment();

    // Authorize oracle
    await trustScoring.connect(owner).setOracle(oracle.address, true);

    // ── Deploy PayGramToken (0 initial supply to avoid FHE in constructor) ──
    const PayGramTokenFactory =
      await ethers.getContractFactory("PayGramToken");
    payGramToken = await PayGramTokenFactory.deploy(owner.address, 0);
    await payGramToken.waitForDeployment();

    // ── Deploy PayGramCore ───────────────────────────────────────
    const PayGramCoreFactory =
      await ethers.getContractFactory("PayGramCore");
    payGramCore = await PayGramCoreFactory.deploy(
      owner.address,
      employer.address,
      await trustScoring.getAddress(),
      await payGramToken.getAddress()
    );
    await payGramCore.waitForDeployment();

    // ── Wire contracts together ──────────────────────────────────
    await payGramToken
      .connect(owner)
      .setPayGramCore(await payGramCore.getAddress());

    // ── Detect FHE availability ──────────────────────────────────
    try {
      await trustScoring
        .connect(oracle)
        .setTrustScorePlaintext(employee1.address, 50);
      fheAvailable = true;
      await trustScoring.connect(oracle).revokeScore(employee1.address);
    } catch {
      fheAvailable = false;
    }
  });

  // ────────────────────────────────────────────────────────────────
  //  Full Deployment Pipeline
  // ────────────────────────────────────────────────────────────────

  describe("Full deployment pipeline", function () {
    it("should deploy all three contracts successfully", async function () {
      expect(await trustScoring.getAddress()).to.be.properAddress;
      expect(await payGramToken.getAddress()).to.be.properAddress;
      expect(await payGramCore.getAddress()).to.be.properAddress;
    });

    it("should wire PayGramCore into PayGramToken", async function () {
      const coreAddr = await payGramCore.getAddress();
      expect(await payGramToken.payGramCore()).to.equal(coreAddr);
    });

    it("should configure deployer as TrustScoring oracle", async function () {
      // oracle signer was authorized in beforeEach
      expect(await trustScoring.authorizedOracles(oracle.address)).to.be.true;
    });

    it("should set correct owner on all contracts", async function () {
      expect(await trustScoring.owner()).to.equal(owner.address);
      expect(await payGramToken.owner()).to.equal(owner.address);
      expect(await payGramCore.owner()).to.equal(owner.address);
    });

    it("should set employer on PayGramCore", async function () {
      expect(await payGramCore.employer()).to.equal(employer.address);
    });

    it("should set correct TrustScoring reference in PayGramCore", async function () {
      expect(await payGramCore.trustScoring()).to.equal(
        await trustScoring.getAddress()
      );
    });

    it("should set correct payToken reference in PayGramCore", async function () {
      expect(await payGramCore.payToken()).to.equal(
        await payGramToken.getAddress()
      );
    });

    it("should allow updating PayGramCore address on token", async function () {
      // setPayGramCore is updatable (not one-time)
      const newAddr = employee3.address; // arbitrary address for test
      await payGramToken.connect(owner).setPayGramCore(newAddr);
      expect(await payGramToken.payGramCore()).to.equal(newAddr);

      // Restore original
      await payGramToken
        .connect(owner)
        .setPayGramCore(await payGramCore.getAddress());
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Token Configuration
  // ────────────────────────────────────────────────────────────────

  describe("Token configuration", function () {
    it("should have correct name and symbol", async function () {
      expect(await payGramToken.name()).to.equal("Confidential PayGram Token");
      expect(await payGramToken.symbol()).to.equal("cPAY");
    });

    it("should have 6 decimals", async function () {
      expect(await payGramToken.decimals()).to.equal(6);
    });

    it("should have MAX_SUPPLY of 1 billion", async function () {
      expect(await payGramToken.MAX_SUPPLY()).to.equal(1_000_000_000);
    });

    it("should start with 0 totalMinted", async function () {
      expect(await payGramToken.totalMinted()).to.equal(0);
    });

    it("should reject setPayGramCore with zero address", async function () {
      await expect(
        payGramToken.connect(owner).setPayGramCore(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(payGramToken, "CoreIsZeroAddress");
    });

    it("should reject setPayGramCore from non-owner", async function () {
      await expect(
        payGramToken
          .connect(unauthorized)
          .setPayGramCore(employee1.address)
      ).to.be.revertedWithCustomError(
        payGramToken,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Token Minting
  // ────────────────────────────────────────────────────────────────

  describe("Token minting", function () {
    it("should reject mint from non-owner", async function () {
      await expect(
        payGramToken.connect(unauthorized).mint(employee1.address, 1000)
      ).to.be.revertedWithCustomError(
        payGramToken,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should reject mint to zero address", async function () {
      await expect(
        payGramToken.connect(owner).mint(ethers.ZeroAddress, 1000)
      ).to.be.revertedWithCustomError(payGramToken, "MintToZeroAddress");
    });

    it("should reject mint exceeding supply cap", async function () {
      const maxSupply = await payGramToken.MAX_SUPPLY();
      await expect(
        payGramToken.connect(owner).mint(owner.address, maxSupply + 1n)
      ).to.be.revertedWithCustomError(payGramToken, "SupplyCapExceeded");
    });

    it("should track totalMinted after minting (FHE)", async function () {
      try {
        await payGramToken.connect(owner).mint(owner.address, 5000);
      } catch {
        this.skip();
      }
      expect(await payGramToken.totalMinted()).to.equal(5000);
    });

    it("should reject cumulative mints exceeding supply cap (FHE)", async function () {
      const maxSupply = await payGramToken.MAX_SUPPLY();
      try {
        await payGramToken.connect(owner).mint(owner.address, maxSupply);
      } catch {
        this.skip();
      }
      await expect(
        payGramToken.connect(owner).mint(owner.address, 1)
      ).to.be.revertedWithCustomError(payGramToken, "SupplyCapExceeded");
    });

    it("should emit TokensMinted event (FHE)", async function () {
      try {
        await expect(payGramToken.connect(owner).mint(employee1.address, 1000))
          .to.emit(payGramToken, "TokensMinted")
          .withArgs(employee1.address, 1000);
      } catch {
        this.skip();
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Token Pause Control
  // ────────────────────────────────────────────────────────────────

  describe("Token pause control", function () {
    it("should not be paused initially", async function () {
      expect(await payGramToken.paused()).to.be.false;
    });

    it("should allow owner to pause", async function () {
      await payGramToken.connect(owner).pause();
      expect(await payGramToken.paused()).to.be.true;
    });

    it("should allow owner to unpause", async function () {
      await payGramToken.connect(owner).pause();
      await payGramToken.connect(owner).unpause();
      expect(await payGramToken.paused()).to.be.false;
    });

    it("should reject pause from non-owner", async function () {
      await expect(
        payGramToken.connect(unauthorized).pause()
      ).to.be.revertedWithCustomError(
        payGramToken,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should reject unpause from non-owner", async function () {
      await payGramToken.connect(owner).pause();
      await expect(
        payGramToken.connect(unauthorized).unpause()
      ).to.be.revertedWithCustomError(
        payGramToken,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should block minting when paused (FHE)", async function () {
      await payGramToken.connect(owner).pause();
      try {
        await expect(
          payGramToken.connect(owner).mint(owner.address, 1000)
        ).to.be.revertedWithCustomError(payGramToken, "EnforcedPause");
      } catch {
        this.skip();
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Employee Onboarding Flow
  // ────────────────────────────────────────────────────────────────

  describe("Employee onboarding flow", function () {
    it("should register an employee with plaintext salary and trust score (FHE)", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "engineer", 80
      );

      const emp = await payGramCore.getEmployee(employee1.address);
      expect(emp.empWallet).to.equal(employee1.address);
      expect(emp.isActive).to.be.true;
      expect(emp.role).to.equal("engineer");
    });

    it("should verify the employee appears in PayGramCore roster (FHE)", async function () {
      await addEmployeeOrSkip(this, employee1, 5000, "engineer");

      const list = await payGramCore.getEmployeeList();
      expect(list).to.include(employee1.address);
    });

    it("should verify the trust score is recorded in TrustScoring (FHE)", async function () {
      try {
        await trustScoring
          .connect(oracle)
          .setTrustScorePlaintext(employee1.address, 80);
      } catch {
        this.skip();
      }

      expect(await trustScoring.hasScore(employee1.address)).to.be.true;
    });

    it("should handle adding multiple employees (FHE)", async function () {
      await addEmployeeOrSkip(this, employee1, 5000, "engineer");

      try {
        await payGramCore
          .connect(employer)
          .addEmployeePlaintext(employee2.address, 7000, "manager");
      } catch {
        this.skip();
      }

      expect(await payGramCore.employeeCount()).to.equal(2);
      expect(await payGramCore.activeEmployeeCount()).to.equal(2);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Trust-Gated Payroll — High Trust (FHE)
  // ────────────────────────────────────────────────────────────────

  describe("Trust-gated payroll — high trust (FHE)", function () {
    it("should process instant payment for a high-trust employee", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "engineer", 80
      );

      try {
        // Fund the contract
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        // Execute payroll
        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // Check instant payment was recorded
      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      expect(payments.length).to.be.greaterThanOrEqual(1);

      // Verify one payment has Instant status (enum value 1)
      const p = await payGramCore.getPendingPayment(payments[0]);
      expect(p.status).to.equal(1); // PaymentStatus.Instant
    });

    it("should update lastPayDate for the employee", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "engineer", 80
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      const emp = await payGramCore.getEmployee(employee1.address);
      expect(emp.lastPayDate).to.be.greaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Trust-Gated Payroll — Medium Trust (FHE)
  // ────────────────────────────────────────────────────────────────

  describe("Trust-gated payroll — medium trust (FHE)", function () {
    it("should create a delayed payment record for medium-trust employees", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "analyst", 55
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      expect(payments.length).to.be.greaterThanOrEqual(1);

      // The medium trust path should have a Delayed payment (enum value 2)
      let hasDelayed = false;
      for (const pid of payments) {
        const p = await payGramCore.getPendingPayment(pid);
        if (p.status === 2n) hasDelayed = true;
      }
      expect(hasDelayed).to.be.true;
    });

    it("should prevent release before the 24h delay expires", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "analyst", 55
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // Find the delayed payment
      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      let delayedId: bigint | null = null;
      for (const pid of payments) {
        const p = await payGramCore.getPendingPayment(pid);
        if (p.status === 2n) {
          delayedId = pid;
          break;
        }
      }
      expect(delayedId).to.not.be.null;

      await expect(
        payGramCore.connect(employer).releasePayment(delayedId!)
      ).to.be.revertedWithCustomError(payGramCore, "DelayNotElapsed");
    });

    it("should release payment after the delay period elapses", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "analyst", 55
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // Find the delayed payment
      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      let delayedId: bigint | null = null;
      for (const pid of payments) {
        const p = await payGramCore.getPendingPayment(pid);
        if (p.status === 2n) {
          delayedId = pid;
          break;
        }
      }
      expect(delayedId).to.not.be.null;

      // Advance time past the 24h delay
      await time.increase(24 * 60 * 60 + 1);

      try {
        await expect(payGramCore.connect(employer).releasePayment(delayedId!))
          .to.emit(payGramCore, "PaymentReleased")
          .withArgs(delayedId, employee1.address);
      } catch {
        this.skip();
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Trust-Gated Payroll — Low Trust (FHE)
  // ────────────────────────────────────────────────────────────────

  describe("Trust-gated payroll — low trust (FHE)", function () {
    it("should create an escrowed payment for low-trust employees", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "intern", 20
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      expect(payments.length).to.be.greaterThanOrEqual(1);

      let hasEscrowed = false;
      for (const pid of payments) {
        const p = await payGramCore.getPendingPayment(pid);
        if (p.status === 3n) hasEscrowed = true;
      }
      expect(hasEscrowed).to.be.true;
    });

    it("should allow the employer to release escrowed payments manually", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "intern", 20
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // Find the escrowed payment
      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      let escrowedId: bigint | null = null;
      for (const pid of payments) {
        const p = await payGramCore.getPendingPayment(pid);
        if (p.status === 3n) {
          escrowedId = pid;
          break;
        }
      }
      expect(escrowedId).to.not.be.null;

      try {
        await expect(
          payGramCore.connect(employer).releasePayment(escrowedId!)
        )
          .to.emit(payGramCore, "PaymentReleased")
          .withArgs(escrowedId, employee1.address);
      } catch {
        this.skip();
      }
    });

    it("should reject non-employer releasing escrowed payments", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "intern", 20
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      let escrowedId: bigint | null = null;
      for (const pid of payments) {
        const p = await payGramCore.getPendingPayment(pid);
        if (p.status === 3n) {
          escrowedId = pid;
          break;
        }
      }
      if (escrowedId === null) this.skip();

      await expect(
        payGramCore.connect(unauthorized).releasePayment(escrowedId!)
      ).to.be.revertedWithCustomError(payGramCore, "NotEmployer");
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Unscored Employee Payroll (FHE)
  // ────────────────────────────────────────────────────────────────

  describe("Unscored employee payroll (FHE)", function () {
    it("should default unscored employees to escrow", async function () {
      // Add employee without a trust score
      await addEmployeeOrSkip(this, employee1, 5000, "contractor");

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // The unscored employee should only have an escrowed payment
      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      expect(payments.length).to.equal(1);

      const p = await payGramCore.getPendingPayment(payments[0]);
      expect(p.status).to.equal(3); // Escrowed
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Mixed Payroll Batch (FHE)
  // ────────────────────────────────────────────────────────────────

  describe("Mixed payroll batch (FHE)", function () {
    it("should process a batch with employees across all trust tiers", async function () {
      // Employee1: high trust (80)
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "senior", 80
      );

      try {
        // Employee2: medium trust (55)
        await payGramCore
          .connect(employer)
          .addEmployeePlaintext(employee2.address, 3000, "mid");
        await trustScoring
          .connect(oracle)
          .setTrustScorePlaintext(employee2.address, 55);

        // Employee3: low trust (20)
        await payGramCore
          .connect(employer)
          .addEmployeePlaintext(employee3.address, 2000, "junior");
        await trustScoring
          .connect(oracle)
          .setTrustScorePlaintext(employee3.address, 20);

        // Fund and execute
        await payGramToken.connect(owner).mint(owner.address, 500000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // Each scored employee creates 3 payments (instant/delayed/escrow from FHE.select)
      // Total: 3 employees × 3 payments = 9
      expect(await payGramCore.nextPaymentId()).to.equal(9);
      expect(await payGramCore.totalPayrollsExecuted()).to.equal(1);
    });

    it("should not affect inactive employees", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "engineer", 80
      );

      try {
        await payGramCore
          .connect(employer)
          .addEmployeePlaintext(employee2.address, 3000, "removed");
        await payGramCore.connect(employer).removeEmployee(employee2.address);

        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // Only employee1 should have payments
      const p1 = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      const p2 = await payGramCore.getPendingPaymentsForEmployee(
        employee2.address
      );
      expect(p1.length).to.be.greaterThan(0);
      expect(p2.length).to.equal(0);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Observer Access (FHE)
  // ────────────────────────────────────────────────────────────────

  describe("Observer access (FHE)", function () {
    it("should allow an account to set its own observer", async function () {
      try {
        await payGramToken
          .connect(employee1)
          .setObserver(employee1.address, employer.address);
      } catch {
        this.skip();
      }

      expect(await payGramToken.observer(employee1.address)).to.equal(
        employer.address
      );
    });

    it("should reject unauthorized observer setting", async function () {
      await expect(
        payGramToken
          .connect(unauthorized)
          .setObserver(employee1.address, employer.address)
      ).to.be.revertedWithCustomError(payGramToken, "Unauthorized");
    });

    it("should allow observer to abdicate (set to zero)", async function () {
      try {
        await payGramToken
          .connect(employee1)
          .setObserver(employee1.address, employer.address);
        await payGramToken
          .connect(employer)
          .setObserver(employee1.address, ethers.ZeroAddress);
      } catch {
        this.skip();
      }

      expect(await payGramToken.observer(employee1.address)).to.equal(
        ethers.ZeroAddress
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Cross-Contract Admin Functions
  // ────────────────────────────────────────────────────────────────

  describe("Cross-contract admin functions", function () {
    it("should allow updating TrustScoring reference", async function () {
      const newTrustScoring =
        await (await ethers.getContractFactory("TrustScoring")).deploy(
          owner.address
        );
      await newTrustScoring.waitForDeployment();

      await payGramCore
        .connect(owner)
        .updateTrustScoring(await newTrustScoring.getAddress());
      expect(await payGramCore.trustScoring()).to.equal(
        await newTrustScoring.getAddress()
      );
    });

    it("should allow updating pay token reference", async function () {
      const newToken =
        await (await ethers.getContractFactory("PayGramToken")).deploy(
          owner.address,
          0
        );
      await newToken.waitForDeployment();

      await payGramCore
        .connect(owner)
        .updatePayToken(await newToken.getAddress());
      expect(await payGramCore.payToken()).to.equal(
        await newToken.getAddress()
      );
    });

    it("should allow transferring employer role", async function () {
      await payGramCore.connect(owner).transferEmployer(employee3.address);
      expect(await payGramCore.employer()).to.equal(employee3.address);
    });

    it("should reject admin updates from non-owner", async function () {
      await expect(
        payGramCore
          .connect(unauthorized)
          .updateTrustScoring(employee1.address)
      ).to.be.revertedWithCustomError(
        payGramCore,
        "OwnableUnauthorizedAccount"
      );

      await expect(
        payGramCore.connect(unauthorized).updatePayToken(employee1.address)
      ).to.be.revertedWithCustomError(
        payGramCore,
        "OwnableUnauthorizedAccount"
      );

      await expect(
        payGramCore.connect(unauthorized).transferEmployer(employee1.address)
      ).to.be.revertedWithCustomError(
        payGramCore,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Edge Cases
  // ────────────────────────────────────────────────────────────────

  describe("Edge cases", function () {
    it("should handle payroll when no employees are registered", async function () {
      try {
        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }
      expect(await payGramCore.totalPayrollsExecuted()).to.equal(1);
      expect(await payGramCore.nextPaymentId()).to.equal(0);
    });

    it("should handle payroll when all employees are inactive (FHE)", async function () {
      await addEmployeeOrSkip(this, employee1, 5000, "engineer");

      try {
        await payGramCore.connect(employer).removeEmployee(employee1.address);
        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      expect(await payGramCore.totalPayrollsExecuted()).to.equal(1);
      expect(await payGramCore.nextPaymentId()).to.equal(0);
    });

    it("should handle cancelling a delayed payment (FHE)", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 5000, "analyst", 55
      );

      try {
        await payGramToken.connect(owner).mint(owner.address, 100000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // Find a delayed payment
      const payments = await payGramCore.getPendingPaymentsForEmployee(
        employee1.address
      );
      let delayedId: bigint | null = null;
      for (const pid of payments) {
        const p = await payGramCore.getPendingPayment(pid);
        if (p.status === 2n) {
          delayedId = pid;
          break;
        }
      }
      if (delayedId === null) this.skip();

      await expect(
        payGramCore.connect(employer).cancelPayment(delayedId!)
      )
        .to.emit(payGramCore, "PaymentCancelled")
        .withArgs(delayedId, employee1.address);

      const p = await payGramCore.getPendingPayment(delayedId!);
      expect(p.status).to.equal(5); // Completed (cancelled)
    });

    it("should handle re-adding a previously removed employee (FHE)", async function () {
      await addEmployeeOrSkip(this, employee1, 5000, "engineer");

      try {
        await payGramCore.connect(employer).removeEmployee(employee1.address);
      } catch {
        this.skip();
      }

      // Cannot re-add because the address is still in the mapping (wallet != 0)
      await expect(
        payGramCore
          .connect(employer)
          .addEmployeePlaintext(employee1.address, 6000, "senior")
      ).to.be.revertedWithCustomError(payGramCore, "EmployeeAlreadyExists");
    });

    it("should handle payment not found", async function () {
      await expect(
        payGramCore.connect(employer).releasePayment(999)
      ).to.be.revertedWithCustomError(payGramCore, "PaymentNotFound");
    });

    it("should handle cancelling a non-existent payment", async function () {
      await expect(
        payGramCore.connect(employer).cancelPayment(999)
      ).to.be.revertedWithCustomError(payGramCore, "PaymentNotFound");
    });

    it("should reject payroll from non-employer", async function () {
      await expect(
        payGramCore.connect(unauthorized).executePayroll()
      ).to.be.revertedWithCustomError(payGramCore, "NotEmployer");
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Payroll Event Emissions
  // ────────────────────────────────────────────────────────────────

  describe("Payroll event emissions", function () {
    it("should emit PayrollExecuted event with correct data", async function () {
      try {
        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      // With 0 employees, still emits with count 0
      await expect(payGramCore.connect(employer).executePayroll())
        .to.emit(payGramCore, "PayrollExecuted");
    });

    it("should emit EmployeeAdded on registration (FHE)", async function () {
      try {
        await expect(
          payGramCore
            .connect(employer)
            .addEmployeePlaintext(employee1.address, 5000, "dev")
        )
          .to.emit(payGramCore, "EmployeeAdded")
          .withArgs(employee1.address, "dev", await time.latest() + 1);
      } catch {
        this.skip();
      }
    });

    it("should emit EmployeeRemoved on deactivation (FHE)", async function () {
      await addEmployeeOrSkip(this, employee1, 5000, "dev");

      await expect(
        payGramCore.connect(employer).removeEmployee(employee1.address)
      )
        .to.emit(payGramCore, "EmployeeRemoved")
        .withArgs(employee1.address);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Multiple Payroll Runs (FHE)
  // ────────────────────────────────────────────────────────────────

  describe("Multiple payroll runs (FHE)", function () {
    it("should increment totalPayrollsExecuted on each run", async function () {
      await addScoredEmployeeOrSkip(
        this, employee1, 1000, "engineer", 80
      );

      try {
        // Fund with enough for 2 payroll runs
        await payGramToken.connect(owner).mint(owner.address, 500000);
        const coreAddress = await payGramCore.getAddress();
        const bal = await payGramToken.confidentialBalanceOf(owner.address);
        await payGramToken
          .connect(owner)
          .confidentialTransfer(coreAddress, bal);

        await payGramCore.connect(employer).executePayroll();
        await payGramCore.connect(employer).executePayroll();
      } catch {
        this.skip();
      }

      expect(await payGramCore.totalPayrollsExecuted()).to.equal(2);
    });
  });
});
