const squadService = require("../services/squad.service");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const {
  success, error, generateTransactionRef,
  nairaToKobo, koboToNaira, extractAxiosError,
} = require("../utils/helpers");
const { v4: uuidv4 } = require("uuid");

/**
 * POST /api/wallet/create
 * Creates a Squad virtual account for the logged-in user.
 * Called at end of onboarding after PIN setup.
 */
const createWallet = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.virtualAccountNumber) {
      return error(res, "Wallet already exists for this account", 409);
    }

    const { bvn, dob, address, beneficiaryAccount } = req.body;

    const squadData = await squadService.createVirtualAccount({
      customerIdentifier: user.customerIdentifier,
      firstName: user.firstName,
      lastName: user.lastName,
      mobileNum: user.phone,
      email: user.email || `${user.customerIdentifier}@ecolink.app`,
      bvn,
      dob,
      address: address || user.address,
      gender: user.gender || "male",
      beneficiaryAccount,
    });

    user.virtualAccountNumber = squadData?.data?.virtual_account_number;
    user.bankCode = squadData?.data?.bank_code;
    await user.save();

    return success(res, {
      virtualAccountNumber: user.virtualAccountNumber,
      bankCode: user.bankCode,
      bankName: "GTBank",
      squadResponse: squadData,
    }, "Wallet created successfully", 201);

  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

const getBalance = async (req, res, next) => {
  try {
    // Return user's individual balance from their transaction history
    // instead of calling Squad's merchant ledger (which needs full KYC)
    const user = req.user;
    const Transaction = require("../models/Transaction");

    const credits = await Transaction.find({
      customerIdentifier: user.customerIdentifier,
      transactionType: { $ne: "Transfer" },
    });

    const debits = await Transaction.find({
      customerIdentifier: user.customerIdentifier,
      transactionType: "Transfer",
    });

    const totalIn = credits.reduce((s, t) => s + (t.merchantAmount || 0), 0);
    const totalOut = debits.reduce((s, t) => s + (t.amount || 0), 0);
    const balance = totalIn - totalOut;

    return success(res, {
      balance_kobo: balance,
      balance_naira: koboToNaira(Math.max(0, balance)),
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/wallet/transactions
 * Get logged-in user's transaction history from MongoDB.
 */
const getTransactions = async (req, res, next) => {
  try {
    const user = req.user;
    const { limit = 50, page = 1, purpose } = req.query;

    const filter = { customerIdentifier: user.customerIdentifier };
    if (purpose) filter.purpose = purpose;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Transaction.countDocuments(filter);

    return success(res, { transactions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/wallet/send
 * Send money — 3-step flow matches frontend /wallet/send.
 * Step: recipient lookup → confirm → execute transfer.
 */
const sendMoney = async (req, res, next) => {
  try {
    const { bankCode, accountNumber, accountName, amount, note } = req.body;

    // Verify account first
    const lookup = await squadService.lookupAccount({ bankCode, accountNumber });
    if (!lookup?.data?.account_name) {
      return error(res, "Could not verify recipient account", 400);
    }

    const transactionReference = generateTransactionRef("SEND");

    const transfer = await squadService.transferFunds({
      bankCode,
      accountNumber,
      accountName: accountName || lookup.data.account_name,
      amount: nairaToKobo(amount),
      remark: note || "EcoLink transfer",
      transactionReference,
    });

    return success(res, {
      transactionReference,
      recipientName: lookup.data.account_name,
      amount,
      transferResponse: transfer,
    }, "Transfer initiated");

  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/wallet/lookup
 * Verify a recipient account before sending — used in step 1 of send flow.
 */
const lookupAccount = async (req, res, next) => {
  try {
    const { bankCode, accountNumber } = req.body;
    const data = await squadService.lookupAccount({ bankCode, accountNumber });
    return success(res, data?.data, "Account verified");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/wallet/payment-link
 * Generate a shareable payment link — used in /wallet/receive.
 * No recipient app needed.
 */
const createPaymentLink = async (req, res, next) => {
  try {
    const user = req.user;
    const { amount, description } = req.body;

    const hash = uuidv4().replace(/-/g, "").slice(0, 16);

    const data = await squadService.createPaymentLink({
      name: user.fullName || user.phone,
      hash,
      amount: nairaToKobo(amount),
      description: description || `Pay ${user.fullName || user.phone} via EcoLink`,
      redirectLink: `${process.env.FRONTEND_URL}/wallet`,
      supportEmail: user.email || "support@ecolink.app",
    });

    return success(res, { hash, paymentLink: data, ...data }, "Payment link created");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/wallet/ussd
 * Initiate USSD payment — for zero-data users (*1234# fallback).
 */
const initiateUssd = async (req, res, next) => {
  try {
    const user = req.user;
    const { amount, bankCode } = req.body;

    const transactionReference = generateTransactionRef("USSD");

    const data = await squadService.initiateUssdPayment({
      transactionReference,
      amount: nairaToKobo(amount),
      bankCode,
      customer: {
        name: user.fullName || user.phone,
        email: user.email || `${user.customerIdentifier}@ecolink.app`,
      },
      webhookUrl: `${process.env.BACKEND_URL || "https://your-api.com"}/api/webhooks/squad`,
    });

    return success(res, { transactionReference, ...data }, "USSD payment initiated");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

module.exports = {
  createWallet,
  getBalance,
  getTransactions,
  sendMoney,
  lookupAccount,
  createPaymentLink,
  initiateUssd,
};