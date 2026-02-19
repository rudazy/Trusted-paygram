// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title PayGramToken (cPAY)
 * @notice ERC-7984 confidential token used as the payment medium inside Trusted PayGram.
 *         Balances and transfer amounts are fully encrypted via Zama FHEVM — only parties
 *         with explicit FHE grants can decrypt their own values.
 *
 * @dev Extends OpenZeppelin's ERC7984 implementation.  The PayGramCore contract is set
 *      once after deployment and receives a blanket allowance to move tokens during
 *      payroll execution.  Observer access (e.g., for employer auditing) is planned
 *      for a future release.
 */
contract PayGramToken is ZamaEthereumConfig, ERC7984, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    address public payGramCore;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PayGramCoreSet(address indexed core);
    event TokensMinted(address indexed to, uint64 amount);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error CoreAlreadyConfigured();
    error CoreIsZeroAddress();
    error CallerNotOwnerOrCore();
    error MintToZeroAddress();

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @param initialOwner  Account that will own this token contract.
     * @param initialSupply Plaintext amount to mint to the owner at deployment.
     */
    constructor(
        address initialOwner,
        uint64 initialSupply
    )
        ERC7984("Confidential PayGram Token", "cPAY", "")
        Ownable(initialOwner)
    {
        if (initialSupply > 0) {
            euint64 encryptedSupply = FHE.asEuint64(initialSupply);
            _mint(initialOwner, encryptedSupply);
            emit TokensMinted(initialOwner, initialSupply);
        }
    }

    /*//////////////////////////////////////////////////////////////
                          CORE INTEGRATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Binds the PayGramCore contract.  Can only be called once.
     * @param core Address of the deployed PayGramCore.
     */
    function setPayGramCore(address core) external onlyOwner {
        if (payGramCore != address(0)) revert CoreAlreadyConfigured();
        if (core == address(0)) revert CoreIsZeroAddress();

        payGramCore = core;
        emit PayGramCoreSet(core);
    }

    /*//////////////////////////////////////////////////////////////
                              MINTING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mints `amount` tokens (plaintext) to `to`.
     * @dev    Restricted to the contract owner.
     * @param to     Recipient of newly minted tokens.
     * @param amount Plaintext token quantity.
     */
    function mint(address to, uint64 amount) external onlyOwner {
        if (to == address(0)) revert MintToZeroAddress();

        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(to, encryptedAmount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Mints tokens from an encrypted input — used for confidential top-ups.
     * @param to             Recipient address.
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

    /*//////////////////////////////////////////////////////////////
                         INTERNAL OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Extends the base _update hook to grant FHE read access for the updated
     *      total supply to the contract owner, enabling off-chain auditing.
     */
    function _update(
        address from,
        address to,
        euint64 amount
    ) internal virtual override returns (euint64 transferred) {
        transferred = super._update(from, to, amount);

        // Owner can always audit the total supply
        FHE.allow(confidentialTotalSupply(), owner());
    }

    /*//////////////////////////////////////////////////////////////
                        OBSERVER ACCESS (TODO)
    //////////////////////////////////////////////////////////////*/

    // TODO (Day 4): Implement observer role for employer auditing.
    //
    // Planned approach:
    //   - mapping(address => bool) private _observers;
    //   - setObserver(address, bool) onlyOwner
    //   - Override _update to also grant FHE.allow to observers on recipient balances
    //   - Emit ObserverAdded / ObserverRemoved events
    //
    // This enables employers to verify encrypted payroll disbursements
    // without revealing balances to other participants.
}
