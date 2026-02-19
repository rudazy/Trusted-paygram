# Architecture — Trusted PayGram

## Contract Topology

```
┌────────────────────┐
│   TrustScoring     │  Standalone — no external contract dependencies
│   (Ownable2Step)   │  Oracles push encrypted scores
└────────┬───────────┘
         │ isHighTrust / isMediumTrust (read-only)
         │
┌────────▼───────────┐       ┌─────────────────────┐
│   PayGramCore      │──────▶│   PayGramToken      │
│   (Ownable2Step)   │       │   (ERC-7984)        │
│   Payroll Engine   │       │   cPAY token        │
└────────────────────┘       └─────────────────────┘
         ▲                            ▲
         │ addEmployee / executePayroll│ transfer / mint
         │                            │
    ┌────┴───────┐              ┌─────┴──────┐
    │  Employer  │              │  Deployer   │
    └────────────┘              └────────────┘
```

## Data Flow — Employee Onboarding

```
Employer                     PayGramCore              TrustScoring
   │                              │                        │
   │ addEmployee(wallet,          │                        │
   │   encSalary, proof)         │                        │
   │─────────────────────────────▶│                        │
   │                              │                        │
   │                  FHE.fromExternal()                   │
   │                  FHE.allowThis()                      │
   │                  store Employee struct                 │
   │                              │                        │
   │◀─────────────────────────────│                        │
   │  EmployeeAdded event         │                        │
   │                              │                        │
Oracle                            │                        │
   │ setTrustScore(wallet,        │                        │
   │   encScore, proof)           │                        │
   │───────────────────────────────────────────────────────▶│
   │                              │              FHE.fromExternal()
   │                              │              FHE.allowThis()
   │                              │              store score
   │◀───────────────────────────────────────────────────────│
   │  TrustScoreUpdated event     │                        │
```

## Data Flow — Payroll Execution

```
Employer              PayGramCore          TrustScoring      PayGramToken
   │                       │                    │                 │
   │ executePayroll()      │                    │                 │
   │──────────────────────▶│                    │                 │
   │                       │                    │                 │
   │               for each active employee:    │                 │
   │                       │                    │                 │
   │                       │ isHighTrust(emp)   │                 │
   │                       │───────────────────▶│                 │
   │                       │◀───────────────────│                 │
   │                       │    ebool           │                 │
   │                       │                    │                 │
   │                       │ isMediumTrust(emp) │                 │
   │                       │───────────────────▶│                 │
   │                       │◀───────────────────│                 │
   │                       │    ebool           │                 │
   │                       │                    │                 │
   │              FHE.select() branching        │                 │
   │              (all under encryption)        │                 │
   │                       │                    │                 │
   │                       │ HIGH  → transfer(emp, salary)───────▶│
   │                       │ MEDIUM→ store PendingPayment         │
   │                       │ LOW   → store PendingPayment         │
   │                       │                    │                 │
   │◀──────────────────────│                    │                 │
   │ PayrollExecuted event │                    │                 │
```

## Security Model

| Concern | Mitigation |
|---------|------------|
| Unauthorized oracle | `onlyOracle` modifier; oracle list managed by contract owner via `setOracle` |
| Unauthorized payroll | `onlyEmployer` modifier on all PayGramCore management functions |
| Score visibility | Scores stored as `euint64`; FHE grants required for decryption |
| Salary visibility | Salaries stored as `euint64`; only employer and contract hold grants |
| Token balance leakage | ERC-7984 provides encrypted balances natively |
| Input manipulation | `FHE.fromExternal` validates zero-knowledge proof on every encrypted input |
| Ownership hijack | `Ownable2Step` requires explicit acceptance of ownership transfer |
| Reentrancy | No external calls before state updates; checks-effects-interactions pattern |
| Premature release | Time-lock check in `releasePayment` enforces `DELAY_PERIOD` |

## FHE Operations Used

| Operation | Solidity Call | Purpose |
|-----------|--------------|---------|
| Encrypt plaintext | `FHE.asEuint64(value)` | Create encrypted thresholds and zero values |
| Validate input | `FHE.fromExternal(handle, proof)` | Verify ZKPoK on user-submitted ciphertexts |
| Compare (>=) | `FHE.ge(a, b)` | Tier boundary checks |
| Conditional select | `FHE.select(cond, ifTrue, ifFalse)` | Branch on encrypted conditions without decrypting |
| Subtract | `FHE.sub(a, b)` | Compute remaining amounts after instant payment |
| Grant self | `FHE.allowThis(ct)` | Let the contract read its own ciphertexts |
| Grant address | `FHE.allow(ct, addr)` | Let specific addresses decrypt off-chain |

## Deployment Order

1. **TrustScoring** — no dependencies
2. **PayGramToken** — no dependencies (receives initial mint)
3. **PayGramCore** — references both TrustScoring and PayGramToken
4. **Wire-up** — call `PayGramToken.setPayGramCore(coreAddress)`
5. **Oracle setup** — call `TrustScoring.setOracle(oracleAddress, true)`
