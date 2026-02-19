// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title TrustScoring
 * @notice Stores and evaluates encrypted EigenTrust reputation scores for payroll participants.
 *         Scores remain confidential on-chain — tier classification happens entirely within
 *         FHE operations, so neither the contract owner nor external observers can read
 *         the underlying numeric value.
 *
 * @dev Trust tiers drive payment routing in PayGramCore:
 *      - HIGH  (>= 75): instant encrypted transfer
 *      - MEDIUM (>= 40): 24-hour delayed release
 *      - LOW    (< 40): milestone-gated escrow
 */
contract TrustScoring is ZamaEthereumConfig, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint64 public constant HIGH_TRUST_THRESHOLD = 75;
    uint64 public constant MEDIUM_TRUST_THRESHOLD = 40;

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    mapping(address => euint64) private _trustScores;
    mapping(address => bool) private _hasScore;
    mapping(address => bool) public authorizedOracles;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event TrustScoreUpdated(address indexed subject);
    event OracleStatusChanged(address indexed oracle, bool authorized);
    event ScoreAccessGranted(address indexed subject, address indexed viewer);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error CallerNotOracle();
    error SubjectHasNoScore(address subject);
    error OracleIsZeroAddress();
    error SubjectIsZeroAddress();

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOracle() {
        if (!authorizedOracles[msg.sender]) revert CallerNotOracle();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address initialOwner) Ownable(initialOwner) {}

    /*//////////////////////////////////////////////////////////////
                          ORACLE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Grants or revokes oracle authorization.
     * @param oracle   Address of the oracle to modify.
     * @param allowed  Whether the oracle should be authorized.
     */
    function setOracle(address oracle, bool allowed) external onlyOwner {
        if (oracle == address(0)) revert OracleIsZeroAddress();
        authorizedOracles[oracle] = allowed;
        emit OracleStatusChanged(oracle, allowed);
    }

    /*//////////////////////////////////////////////////////////////
                         SCORE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Sets or updates an encrypted trust score for `subject`.
     * @dev    The caller must be an authorized oracle. The encrypted value is validated
     *         through its zero-knowledge proof before storage.
     * @param subject          Address whose trust score is being set.
     * @param encryptedScore   FHE-encrypted score value (0-100 expected range).
     * @param inputProof       ZKPoK proof binding the ciphertext to the caller.
     */
    function setTrustScore(
        address subject,
        externalEuint64 encryptedScore,
        bytes calldata inputProof
    ) external onlyOracle {
        if (subject == address(0)) revert SubjectIsZeroAddress();

        euint64 validated = FHE.fromExternal(encryptedScore, inputProof);

        _trustScores[subject] = validated;
        _hasScore[subject] = true;

        FHE.allowThis(validated);
        FHE.allow(validated, msg.sender);

        emit TrustScoreUpdated(subject);
    }

    /*//////////////////////////////////////////////////////////////
                          TIER EVALUATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Evaluates whether `subject` qualifies for the HIGH trust tier.
     * @dev    Returns an encrypted boolean — the result is not revealed to the caller
     *         unless they hold a decryption grant.
     * @param subject Address to evaluate.
     * @return result  ebool that is true when score >= HIGH_TRUST_THRESHOLD.
     */
    function isHighTrust(address subject) external returns (ebool result) {
        if (!_hasScore[subject]) revert SubjectHasNoScore(subject);

        euint64 threshold = FHE.asEuint64(HIGH_TRUST_THRESHOLD);
        result = FHE.ge(_trustScores[subject], threshold);
    }

    /**
     * @notice Evaluates whether `subject` qualifies for the MEDIUM trust tier.
     * @param subject Address to evaluate.
     * @return result  ebool that is true when score >= MEDIUM_TRUST_THRESHOLD.
     */
    function isMediumTrust(address subject) external returns (ebool result) {
        if (!_hasScore[subject]) revert SubjectHasNoScore(subject);

        euint64 threshold = FHE.asEuint64(MEDIUM_TRUST_THRESHOLD);
        result = FHE.ge(_trustScores[subject], threshold);
    }

    /*//////////////////////////////////////////////////////////////
                            ACCESSORS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the encrypted trust score for `subject`.
     * @dev    The caller must hold a decryption grant (via `allowScoreAccess`) to
     *         actually read the plaintext off-chain.
     * @param subject Address whose score to retrieve.
     * @return score   The encrypted score handle.
     */
    function getTrustScore(address subject) external view returns (euint64 score) {
        if (!_hasScore[subject]) revert SubjectHasNoScore(subject);
        score = _trustScores[subject];
    }

    /**
     * @notice Whether a trust score has been recorded for `subject`.
     */
    function hasScore(address subject) external view returns (bool) {
        return _hasScore[subject];
    }

    /**
     * @notice Grants `viewer` permission to decrypt the trust score of `subject`.
     * @dev    Only the contract owner or the oracle that set the score should call this.
     *         The grant is permanent for the current ciphertext — a score update
     *         produces a new ciphertext that requires a fresh grant.
     * @param subject Address whose score to share.
     * @param viewer  Address that should receive decryption access.
     */
    function allowScoreAccess(address subject, address viewer) external onlyOwner {
        if (!_hasScore[subject]) revert SubjectHasNoScore(subject);

        FHE.allow(_trustScores[subject], viewer);
        emit ScoreAccessGranted(subject, viewer);
    }
}
