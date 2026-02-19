# Development Plan — Trusted PayGram

Two-week sprint targeting the Zama Developer Program Special Bounty Track.

---

## Week 1 — Smart Contracts & Core Logic

### Day 1 — Project Scaffolding
- [x] Initialize Hardhat + TypeScript project
- [x] Configure FHEVM dependencies and Hardhat plugin
- [x] Create contract stubs with full interface definitions
- [x] Write deployment script
- [x] Set up test file structure with pending specs

### Day 2 — TrustScoring Contract
- [ ] Implement `setTrustScore` with encrypted input validation
- [ ] Implement `isHighTrust` / `isMediumTrust` tier evaluation
- [ ] Implement `allowScoreAccess` permission grants
- [ ] Write and pass all TrustScoring unit tests
- [ ] Verify FHE permission model works end-to-end on local node

### Day 3 — PayGramCore Payroll Engine
- [ ] Implement `executePayroll` with trust-gated routing
- [ ] Implement `releasePayment` for delayed and escrowed tiers
- [ ] Add FHE.select branching for tier classification
- [ ] Write and pass PayGramCore unit tests
- [ ] Run integration tests across all three contracts

### Day 4 — PayGramToken & Observer Access
- [ ] Implement observer role in PayGramToken
- [ ] Add employer audit grant via FHE.allow in _update hook
- [ ] Ensure token transfer permissions work for PayGramCore
- [ ] Complete remaining integration tests
- [ ] Gas optimization pass on all contracts

---

## Week 2 — Frontend, Deployment & Documentation

### Day 5 — Frontend Setup
- [ ] Initialize React + Vite project in `frontend/`
- [ ] Integrate ethers.js with fhevmjs for encrypted input creation
- [ ] Build employer dashboard layout (employee list, payroll trigger)
- [ ] Build employee view (encrypted balance display, payment history)

### Day 6 — Frontend Integration
- [ ] Connect dashboard to deployed contracts on Sepolia
- [ ] Implement encrypted salary input form
- [ ] Implement trust score visualization (tier badges, no raw scores)
- [ ] Add payroll execution flow with transaction status tracking
- [ ] Error handling and loading states

### Day 7 — Sepolia Deployment & Testing
- [ ] Deploy all contracts to Sepolia testnet
- [ ] Verify contracts on Etherscan
- [ ] Run full integration test suite against Sepolia
- [ ] Fix any network-specific issues (gas, timing, FHE coprocessor)
- [ ] Document deployed contract addresses

### Day 8 — Documentation & Demo
- [ ] Record demo video (5 min walkthrough)
- [ ] Finalize ARCHITECTURE.md and TRUST_MODEL.md
- [ ] Write submission description for Zama bounty
- [ ] Final code review and cleanup
- [ ] Submit to Zama Developer Program

---

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Contracts compile cleanly | Day 1 | In Progress |
| TrustScoring tests pass | Day 2 | Pending |
| Payroll integration tests pass | Day 3 | Pending |
| Observer audit working | Day 4 | Pending |
| Frontend connected to Sepolia | Day 6 | Pending |
| Demo video recorded | Day 8 | Pending |
| Bounty submission | Day 8 | Pending |
