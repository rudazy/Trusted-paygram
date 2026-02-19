// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {TrustScoring} from "./TrustScoring.sol";
import {PayGramToken} from "./PayGramToken.sol";

/**
 * @title PayGramCore
 * @notice Payroll engine that routes encrypted salary payments through trust-gated tiers.
 *         Employers register employees with encrypted salaries and trigger batch payroll
 *         runs.  The contract evaluates each employee's encrypted trust score to decide
 *         the disbursement path — instant, delayed, or escrowed — without revealing
 *         salaries or scores to any party.
 *
 * @dev Payment routing logic:
 *      1. HIGH trust  (score >= 75) → immediate encrypted transfer
 *      2. MEDIUM trust (score >= 40) → 24 h time-locked release
 *      3. LOW trust   (score <  40) → escrow with milestone release
 *
 *      The `executePayroll` and `releasePayment` functions are left as stubs for Day 3
 *      implementation once the TrustScoring integration tests pass end-to-end.
 */
contract PayGramCore is ZamaEthereumConfig, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint256 public constant DELAY_PERIOD = 24 hours;

    /*//////////////////////////////////////////////////////////////
                                 ENUMS
    //////////////////////////////////////////////////////////////*/

    enum PaymentStatus {
        None,
        Instant,
        Delayed,
        Escrowed,
        Released,
        Completed
    }

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Employee {
        address wallet;
        euint64 encryptedSalary;
        bool isActive;
        uint256 hireDate;
        uint256 lastPayDate;
    }

    struct PendingPayment {
        address employee;
        euint64 encryptedAmount;
        PaymentStatus status;
        uint256 createdAt;
        uint256 releaseAfter;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    TrustScoring public immutable trustScoring;
    PayGramToken public immutable payToken;

    address public employer;

    mapping(address => Employee) private _employees;
    address[] private _employeeList;

    mapping(uint256 => PendingPayment) private _pendingPayments;
    uint256 public nextPaymentId;

    uint256 public lastPayrollRun;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event EmployeeAdded(address indexed wallet, uint256 hireDate);
    event EmployeeRemoved(address indexed wallet);
    event SalaryUpdated(address indexed wallet);
    event PayrollExecuted(uint256 timestamp, uint256 employeeCount);
    event PaymentCreated(uint256 indexed paymentId, address indexed employee, PaymentStatus status);
    event PaymentReleased(uint256 indexed paymentId);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error CallerNotEmployer();
    error EmployeeAlreadyExists(address wallet);
    error EmployeeNotFound(address wallet);
    error EmployeeInactive(address wallet);
    error EmployerIsZeroAddress();
    error WalletIsZeroAddress();
    error PaymentNotFound(uint256 paymentId);
    error PaymentNotReleasable(uint256 paymentId);
    error DelayPeriodNotElapsed(uint256 paymentId);

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyEmployer() {
        if (msg.sender != employer) revert CallerNotEmployer();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @param initialOwner     Admin of this contract (for ownership transfer).
     * @param employerAddress  The employer authorized to manage payroll.
     * @param scoring          Deployed TrustScoring contract reference.
     * @param token            Deployed PayGramToken (cPAY) contract reference.
     */
    constructor(
        address initialOwner,
        address employerAddress,
        TrustScoring scoring,
        PayGramToken token
    ) Ownable(initialOwner) {
        if (employerAddress == address(0)) revert EmployerIsZeroAddress();
        employer = employerAddress;
        trustScoring = scoring;
        payToken = token;
    }

    /*//////////////////////////////////////////////////////////////
                       EMPLOYEE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Registers a new employee with an encrypted salary.
     * @param wallet           Employee's receiving address.
     * @param encryptedSalary  FHE-encrypted salary amount.
     * @param inputProof       ZKPoK proof for the encrypted salary.
     */
    function addEmployee(
        address wallet,
        externalEuint64 encryptedSalary,
        bytes calldata inputProof
    ) external onlyEmployer {
        if (wallet == address(0)) revert WalletIsZeroAddress();
        if (_employees[wallet].isActive) revert EmployeeAlreadyExists(wallet);

        euint64 validatedSalary = FHE.fromExternal(encryptedSalary, inputProof);
        FHE.allowThis(validatedSalary);
        FHE.allow(validatedSalary, employer);

        _employees[wallet] = Employee({
            wallet: wallet,
            encryptedSalary: validatedSalary,
            isActive: true,
            hireDate: block.timestamp,
            lastPayDate: 0
        });
        _employeeList.push(wallet);

        emit EmployeeAdded(wallet, block.timestamp);
    }

    /**
     * @notice Deactivates an employee.  Their record is retained for audit purposes.
     * @param wallet Employee address to deactivate.
     */
    function removeEmployee(address wallet) external onlyEmployer {
        if (!_employees[wallet].isActive) revert EmployeeNotFound(wallet);

        _employees[wallet].isActive = false;
        emit EmployeeRemoved(wallet);
    }

    /**
     * @notice Updates the encrypted salary for an active employee.
     * @param wallet           Employee's address.
     * @param encryptedSalary  New FHE-encrypted salary.
     * @param inputProof       ZKPoK proof for the new salary value.
     */
    function updateSalary(
        address wallet,
        externalEuint64 encryptedSalary,
        bytes calldata inputProof
    ) external onlyEmployer {
        if (!_employees[wallet].isActive) revert EmployeeNotFound(wallet);

        euint64 validatedSalary = FHE.fromExternal(encryptedSalary, inputProof);
        FHE.allowThis(validatedSalary);
        FHE.allow(validatedSalary, employer);

        _employees[wallet].encryptedSalary = validatedSalary;
        emit SalaryUpdated(wallet);
    }

    /*//////////////////////////////////////////////////////////////
                         PAYROLL EXECUTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Runs payroll for all active employees.
     * @dev    For each employee the function:
     *         1. Reads the encrypted trust score tier via TrustScoring
     *         2. Routes payment according to the tier (instant / delayed / escrow)
     *         3. Records a PendingPayment entry for non-instant tiers
     *
     *         Implementation deferred to Day 3 once TrustScoring integration
     *         tests confirm correct tier evaluation end-to-end.
     */
    function executePayroll() external onlyEmployer {
        // TODO (Day 3): Iterate _employeeList, skip inactive entries.
        //
        // For each active employee with a trust score:
        //   ebool highTrust   = trustScoring.isHighTrust(emp.wallet);
        //   ebool mediumTrust = trustScoring.isMediumTrust(emp.wallet);
        //
        //   HIGH tier   → payToken.transfer(emp.wallet, emp.encryptedSalary)
        //   MEDIUM tier → create PendingPayment with releaseAfter = block.timestamp + DELAY_PERIOD
        //   LOW tier    → create PendingPayment as Escrowed (milestone release)
        //
        // Use FHE.select to branch without revealing tier:
        //   euint64 instantAmount = FHE.select(highTrust, emp.encryptedSalary, FHE.asEuint64(0));
        //   euint64 remaining     = FHE.sub(emp.encryptedSalary, instantAmount);
        //   euint64 delayedAmount = FHE.select(mediumTrust, remaining, FHE.asEuint64(0));
        //   euint64 escrowAmount  = FHE.sub(remaining, delayedAmount);

        lastPayrollRun = block.timestamp;
        emit PayrollExecuted(block.timestamp, _employeeList.length);
    }

    /**
     * @notice Releases a delayed or escrowed payment once conditions are met.
     * @dev    For delayed payments the time-lock must have elapsed.
     *         For escrowed payments the employer manually confirms milestone completion.
     *
     *         Implementation deferred to Day 3.
     * @param paymentId Identifier of the pending payment to release.
     */
    function releasePayment(uint256 paymentId) external onlyEmployer {
        PendingPayment storage payment = _pendingPayments[paymentId];
        if (payment.status == PaymentStatus.None) revert PaymentNotFound(paymentId);
        if (payment.status != PaymentStatus.Delayed && payment.status != PaymentStatus.Escrowed) {
            revert PaymentNotReleasable(paymentId);
        }

        if (payment.status == PaymentStatus.Delayed) {
            if (block.timestamp < payment.releaseAfter) {
                revert DelayPeriodNotElapsed(paymentId);
            }
        }

        // TODO (Day 3): Execute the actual encrypted token transfer:
        //   payToken.transfer(payment.employee, payment.encryptedAmount);

        payment.status = PaymentStatus.Released;
        emit PaymentReleased(paymentId);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the number of registered employees (active + inactive).
     */
    function employeeCount() external view returns (uint256) {
        return _employeeList.length;
    }

    /**
     * @notice Checks whether `wallet` is an active employee.
     */
    function isActiveEmployee(address wallet) external view returns (bool) {
        return _employees[wallet].isActive;
    }

    /**
     * @notice Returns public (non-encrypted) fields for an employee.
     * @param wallet Employee address.
     * @return isActive  Whether the employee is currently active.
     * @return hireDate  Timestamp when the employee was registered.
     * @return lastPay   Timestamp of their most recent payroll disbursement.
     */
    function getEmployeeInfo(
        address wallet
    ) external view returns (bool isActive, uint256 hireDate, uint256 lastPay) {
        Employee storage emp = _employees[wallet];
        if (emp.wallet == address(0)) revert EmployeeNotFound(wallet);
        return (emp.isActive, emp.hireDate, emp.lastPayDate);
    }

    /**
     * @notice Returns the details of a pending payment.
     * @param paymentId Payment identifier.
     */
    function getPendingPayment(
        uint256 paymentId
    )
        external
        view
        returns (address employee, PaymentStatus status, uint256 createdAt, uint256 releaseAfter)
    {
        PendingPayment storage p = _pendingPayments[paymentId];
        if (p.status == PaymentStatus.None) revert PaymentNotFound(paymentId);
        return (p.employee, p.status, p.createdAt, p.releaseAfter);
    }
}
