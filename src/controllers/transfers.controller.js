const squadService = require("../services/squad.service");
const {
  success,
  error,
  generateTransactionRef,
  nairaToKobo,
  koboToNaira,
  extractAxiosError,
} = require("../utils/helpers");

/**
 * POST /api/transfers/lookup
 * Verify a bank account before sending money.
 * Always call this before initiating any transfer.
 */
const lookupAccount = async (req, res, next) => {
  try {
    const { bankCode, accountNumber } = req.body;
    const data = await squadService.lookupAccount({ bankCode, accountNumber });
    return success(res, data, "Account lookup successful");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/transfers/send
 * Transfer funds from EcoLink's Squad wallet to a user's bank account.
 *
 * Use cases:
 * - Loan disbursement to informal trader
 * - Gig/job payment to worker
 * - Ajo group withdrawal to beneficiary
 * - Skill grant payout to youth
 *
 * Returns 424 on timeout — always re-query before retrying.
 */
const sendTransfer = async (req, res, next) => {
  try {
    const { bankCode, accountNumber, accountName, amount, remark, refPrefix } = req.body;

    const transactionReference = generateTransactionRef(refPrefix || "TRF");

    const data = await squadService.transferFunds({
      bankCode,
      accountNumber,
      accountName,
      amount: nairaToKobo(amount),
      remark,
      transactionReference,
    });

    return success(res, { transactionReference, ...data }, "Transfer initiated");
  } catch (err) {
    // 424 = timeout — front-end should call /requery before retrying
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/transfers/requery
 * Confirm the final status of a transfer.
 * Call this whenever a transfer returns 424 (timeout/failed).
 * NEVER re-initiate a transfer without re-querying first.
 */
const requeryTransfer = async (req, res, next) => {
  try {
    const { transactionReference } = req.body;
    const data = await squadService.requeryTransfer(transactionReference);
    return success(res, data, "Transfer status retrieved");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * GET /api/transfers
 * Get all outgoing transfers (admin/ops view).
 */
const getAllTransfers = async (req, res, next) => {
  try {
    const data = await squadService.getAllTransfers();
    return success(res, data);
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * GET /api/transfers/balance
 * Check EcoLink's Squad wallet balance.
 * Balance is returned in kobo — converted to naira for display.
 */
const getBalance = async (req, res, next) => {
  try {
    const data = await squadService.getLedgerBalance();
    // Convert balance from kobo to naira for readability
    const balanceNaira = data?.data?.balance
      ? koboToNaira(data.data.balance)
      : null;
    return success(res, { ...data, balance_naira: balanceNaira });
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

module.exports = {
  lookupAccount,
  sendTransfer,
  requeryTransfer,
  getAllTransfers,
  getBalance,
};
