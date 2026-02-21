// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ObserverAccess} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ObserverAccess.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PayGramToken (cPAY)
 * @notice ERC-7984 confidential token used as the payment medium inside Trusted PayGram.
 *         Balances and transfer amounts are fully encrypted via Zama FHEVM — only parties
 *         with explicit FHE grants can decrypt their own values.
 *
 * @dev Extends OpenZeppelin's ERC7984 with ObserverAccess for employer auditing,
 *      Pausable for emergency circuit-breaker, and a hard supply cap of 1 billion tokens.
 *
 *      Observer access allows employers to set an observer on employee accounts so they
 *      can verify encrypted payroll disbursements without revealing balances to others.
 *
 *      The PayGramCore contract address is updatable (not one-time) to support contract
 *      upgrades without redeploying the token.
 */
contract PayGramToken is ZamaEthereumConfig, ERC7984ObserverAccess, Ownable2Step, Pausable {
    // ──────────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────────

    /// @notice Maximum token supply (1 billion cPAY).
    uint64 public constant MAX_SUPPLY = 1_000_000_000;

    // ──────────────────────────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────────────────────────

    /// @notice Address of the PayGramCore contract authorized for payroll operations.
    address public payGramCore;

    /// @notice Cumulative plaintext tokens minted (used for supply cap enforcement).
    uint64 public totalMinted;

    // ──────────────────────────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────────────────────────

    event PayGramCoreUpdated(address indexed oldCore, address indexed newCore);
    event TokensMinted(address indexed to, uint64 amount);

    // ──────────────────────────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────────────────────────

    error CoreIsZeroAddress();
    error MintToZeroAddress();
    error SupplyCapExceeded();

    // ──────────────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────────────

    /**
     * @param initialOwner  Account that will own this token contract.
     * @param initialSupply Plaintext amount to mint to the owner at deployment (0 to skip).
     */
    constructor(
        address initialOwner,
        uint64 initialSupply
    )
        ERC7984("Confidential PayGram Token", "cPAY", "")
        Ownable(initialOwner)
    {
        if (initialSupply > 0) {
            if (initialSupply > MAX_SUPPLY) revert SupplyCapExceeded();

            euint64 encryptedSupply = FHE.asEuint64(initialSupply);
            _mint(initialOwner, encryptedSupply);
            totalMinted = initialSupply;

            emit TokensMinted(initialOwner, initialSupply);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    //  Core Integration
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice Sets or updates the PayGramCore contract address.
     * @dev    Updatable (not one-time) to support contract upgrades without
     *         redeploying the token. Only the owner may call.
     * @param core Address of the deployed PayGramCore.
     */
    function setPayGramCore(address core) external onlyOwner {
        if (core == address(0)) revert CoreIsZeroAddress();

        address oldCore = payGramCore;
        payGramCore = core;

        emit PayGramCoreUpdated(oldCore, core);
    }

    // ──────────────────────────────────────────────────────────────────
    //  Minting — Plaintext
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice Mints `amount` tokens (plaintext) to `to`.
     * @dev    Enforces supply cap via totalMinted tracking.
     *         Restricted to the contract owner and blocked when paused.
     * @param to     Recipient of newly minted tokens.
     * @param amount Plaintext token quantity.
     */
    function mint(address to, uint64 amount) external onlyOwner {
        if (to == address(0)) revert MintToZeroAddress();
        if (uint256(totalMinted) + uint256(amount) > uint256(MAX_SUPPLY))
            revert SupplyCapExceeded();

        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(to, encryptedAmount);
        totalMinted += amount;

        emit TokensMinted(to, amount);
    }

    // ──────────────────────────────────────────────────────────────────
    //  Minting — Encrypted
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice Mints tokens from an encrypted input — used for confidential top-ups.
     * @dev    Cannot enforce supply cap on encrypted amounts (value unknown).
     *         Owner-only; use sparingly with trusted inputs.
     * @param to              Recipient address.
     * @param encryptedAmount FHE-encrypted mint quantity.
     * @param inputProof      ZKPoK proof for the encrypted value.
     */
    function confidentialMint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner {
        if (to == address(0)) revert MintToZeroAddress();

        euint64 validated = FHE.fromExternal(encryptedAmount, inputProof);
        _mint(to, validated);
    }

    // ──────────────────────────────────────────────────────────────────
    //  Pause Control
    // ──────────────────────────────────────────────────────────────────

    /**
     * @notice Pauses all token transfers and minting.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses token transfers and minting.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ──────────────────────────────────────────────────────────────────
    //  Internal Overrides
    // ──────────────────────────────────────────────────────────────────

    /**
     * @dev Extends the ObserverAccess _update hook to:
     *      1. Enforce the pause check on all transfers (including mints and burns).
     *      2. Grant the contract owner FHE read access to the total supply for auditing.
     */
    function _update(
        address from,
        address to,
        euint64 amount
    ) internal virtual override(ERC7984ObserverAccess) whenNotPaused returns (euint64 transferred) {
        transferred = super._update(from, to, amount);

        // Owner can always audit the total supply
        FHE.allow(confidentialTotalSupply(), owner());
    }
}
