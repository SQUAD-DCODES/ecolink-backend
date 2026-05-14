const squadService = require("../services/squad.service");
const {
  success,
  error,
  generateTransactionRef,
  nairaToKobo,
  extractAxiosError,
} = require("../utils/helpers");

/**
 * POST /api/payments/card
 * Charge a customer's card directly.
 * Used for: Ajo contributions, loan repayments, marketplace purchases.
 */
const chargeCard = async (req, res, next) => {
  try {
    const { amount, card, customer, webhookUrl, redirectUrl, passCharge } = req.body;

    const transactionReference = generateTransactionRef("CARD");

    const data = await squadService.chargeCard({
      amount: nairaToKobo(amount),
      card,
      customer,
      webhookUrl,
      redirectUrl,
      transactionReference,
      passsCharge: passCharge || false,
    });

    return success(res, { transactionReference, ...data }, "Card charge initiated");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/payments/authorize
 * Authorize a pending card payment with PIN or OTP.
 * Call this after chargeCard returns transaction_status of ValidatePin or ValidateOTP.
 */
const authorizePayment = async (req, res, next) => {
  try {
    const { transactionReference, authorization } = req.body;

    const data = await squadService.authorizePayment({
      transactionReference,
      authorization,
    });

    return success(res, data, "Payment authorization submitted");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/payments/ussd
 * Initiate a USSD payment.
 * Key for EcoLink's feature-phone users — Ajo contributions, gig payments.
 * Supported banks: GTB (058), Zenith (057), UBA (033), First Bank (011), etc.
 */
const initiateUssd = async (req, res, next) => {
  try {
    const { amount, bankCode, customer, webhookUrl } = req.body;

    const transactionReference = generateTransactionRef("USSD");

    const data = await squadService.initiateUssdPayment({
      transactionReference,
      amount: nairaToKobo(amount),
      bankCode,
      customer,
      webhookUrl,
    });

    return success(res, { transactionReference, ...data }, "USSD payment initiated");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/payments/bank
 * Initiate a direct GTBank account debit.
 */
const initiateDirectBank = async (req, res, next) => {
  try {
    const { amount, bankCode, accountOrPhone, customer, webhookUrl } = req.body;

    const transactionReference = generateTransactionRef("BANK");

    const data = await squadService.initiateDirectBankDebit({
      transactionReference,
      amount: nairaToKobo(amount),
      bankCode,
      accountOrPhone,
      customer,
      webhookUrl,
    });

    return success(res, { transactionReference, ...data }, "Bank debit initiated");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/payments/bank/validate
 * Validate a direct bank payment with OTP/token after initiation.
 */
const validateBankPayment = async (req, res, next) => {
  try {
    const { transactionReference, otpToken } = req.body;

    const data = await squadService.validateBankPayment({
      transactionReference,
      otpToken,
    });

    return success(res, data, "Bank payment validated");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

module.exports = {
  chargeCard,
  authorizePayment,
  initiateUssd,
  initiateDirectBank,
  validateBankPayment,
};
