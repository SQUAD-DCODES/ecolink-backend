const axios = require("axios");
const crypto = require("crypto");
const { SQUAD } = require("../config");

// Axios instance pre-configured with Squad auth
const squadClient = axios.create({
  baseURL: SQUAD.BASE_URL,
  headers: {
    Authorization: `Bearer ${SQUAD.SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ─────────────────────────────────────────────
// VIRTUAL ACCOUNTS
// ─────────────────────────────────────────────

/**
 * Create a virtual account for a new EcoLink user (Customer Model).
 * Each user gets a unique NUBAN tied to their customer_identifier.
 */
const createVirtualAccount = async ({
  customerIdentifier,
  firstName,
  lastName,
  mobileNum,
  email,
  bvn,
  dob,
  address,
  gender,
  beneficiaryAccount,
}) => {
  const response = await squadClient.post("/virtual-account", {
    customer_identifier: customerIdentifier,
    first_name: firstName,
    last_name: lastName,
    mobile_num: mobileNum,
    email,
    bvn,
    dob,
    address,
    gender: gender === "male" ? "1" : "2",
    beneficiary_account: beneficiaryAccount,
  });
  return response.data;
};

/**
 * Create a virtual account for a business/trader (Business Model).
 */
const createBusinessVirtualAccount = async ({
  customerIdentifier,
  businessName,
  mobileNum,
  bvn,
  beneficiaryAccount,
}) => {
  const response = await squadClient.post("/virtual-account/business", {
    customer_identifier: customerIdentifier,
    business_name: businessName,
    mobile_num: mobileNum,
    bvn,
    beneficiary_account: beneficiaryAccount,
  });
  return response.data;
};

/**
 * Get customer details by their virtual account number.
 */
const getCustomerByVirtualAccount = async (virtualAccountNumber) => {
  const response = await squadClient.get(
    `/virtual-account/customer/${virtualAccountNumber}`
  );
  return response.data;
};

/**
 * Get customer details by their customer_identifier.
 */
const getCustomerByIdentifier = async (customerIdentifier) => {
  const response = await squadClient.get(
    `/virtual-account/${customerIdentifier}`
  );
  return response.data;
};

/**
 * Get all transactions for a specific customer.
 */
const getCustomerTransactions = async (customerIdentifier) => {
  const response = await squadClient.get(
    `/virtual-account/customer/transactions/${customerIdentifier}`
  );
  return response.data;
};

/**
 * Get all merchant transactions (across all virtual accounts).
 */
const getAllMerchantTransactions = async (filters = {}) => {
  const response = await squadClient.get(
    "/virtual-account/merchant/transactions/all",
    { params: filters }
  );
  return response.data;
};

/**
 * Get all virtual accounts belonging to the merchant.
 */
const getAllMerchantVirtualAccounts = async () => {
  const response = await squadClient.get("/virtual-account/merchant/accounts");
  return response.data;
};

/**
 * Simulate a payment (sandbox only).
 */
const simulatePayment = async ({ virtualAccountNumber, amount }) => {
  const response = await squadClient.post("/virtual-account/simulate/payment", {
    virtual_account_number: virtualAccountNumber,
    amount,
  });
  return response.data;
};

// ─────────────────────────────────────────────
// TRANSFERS (PAYOUTS)
// ─────────────────────────────────────────────

/**
 * Look up a bank account name before transferring.
 * Always call this before initiating a transfer.
 */
const lookupAccount = async ({ bankCode, accountNumber }) => {
  const response = await squadClient.post("/payout/account/lookup", {
    bank_code: bankCode,
    account_number: accountNumber,
  });
  return response.data;
};

/**
 * Transfer funds from Squad wallet to a bank account.
 * Used for: loan disbursements, gig payouts, Ajo group withdrawals.
 * IMPORTANT: transaction_reference must be unique and include merchant ID.
 */
const transferFunds = async ({
  bankCode,
  accountNumber,
  accountName,
  amount,
  remark,
  transactionReference,
  currencyId = "NGN",
}) => {
  try {
    const ref = transactionReference.includes(SQUAD.MERCHANT_ID)
      ? transactionReference
      : `${SQUAD.MERCHANT_ID}_${transactionReference}`;

    const response = await squadClient.post("/payout/transfer", {
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
      amount: String(amount),
      remark,
      transaction_reference: ref,
      currency_id: currencyId,
    });

    return response.data;
  } catch (err) {
    console.error(
      "SQUAD TRANSFER ERROR:",
      err.response?.data || err.message
    );

    throw err;
  }
};

/**
 * Re-query a transfer to confirm its final status.
 * Call this if a transfer returns a 424 (timeout/failed).
 */
const requeryTransfer = async (transactionReference) => {
  const response = await squadClient.post("/payout/requery", {
    transaction_reference: transactionReference,
  });
  return response.data;
};

/**
 * Get all transfers made from the merchant's Squad wallet.
 */
const getAllTransfers = async () => {
  const response = await squadClient.get("/payout/list");
  return response.data;
};

// ─────────────────────────────────────────────
// DIRECT PAYMENTS (CARD / BANK / USSD)
// ─────────────────────────────────────────────

/**
 * Initiate a direct card charge.
 */
const chargeCard = async ({
  amount,
  currency = "NGN",
  webhookUrl,
  redirectUrl,
  card,
  customer,
  transactionReference,
  passsCharge = false,
}) => {
  const response = await squadClient.post(
    "/transaction/initiate/process-payment",
    {
      transaction_reference: transactionReference,
      amount,
      pass_charge: passsCharge,
      currency,
      webhook_url: webhookUrl,
      redirect_url: redirectUrl,
      card,
      payment_method: "card",
      customer,
    }
  );
  return response.data;
};

/**
 * Authorize a card payment (PIN or OTP step).
 */
const authorizePayment = async ({ transactionReference, authorization }) => {
  const response = await squadClient.post(
    "/transaction/payment/authorize",
    { transaction_reference: transactionReference, authorization }
  );
  return response.data;
};

/**
 * Initiate a USSD payment.
 * Used for feature-phone users who cannot use cards or bank app.
 */
const initiateUssdPayment = async ({
  transactionReference,
  amount,
  currency = "NGN",
  webhookUrl,
  bankCode,
  customer,
  passsCharge = false,
}) => {
  const response = await squadClient.post(
    "/transaction/initiate/process-payment",
    {
      transaction_reference: transactionReference,
      amount,
      pass_charge: passsCharge,
      currency,
      webhook_url: webhookUrl,
      ussd: { bank_code: bankCode },
      payment_method: "ussd",
      customer,
    }
  );
  return response.data;
};

/**
 * Initiate a direct GTBank account debit.
 */
const initiateDirectBankDebit = async ({
  transactionReference,
  amount,
  currency = "NGN",
  webhookUrl,
  bankCode,
  accountOrPhone,
  customer,
}) => {
  const response = await squadClient.post(
    "/transaction/initiate/process-payment",
    {
      transaction_reference: transactionReference,
      amount,
      pass_charge: false,
      currency,
      webhook_url: webhookUrl,
      bank: { bank_code: bankCode, account_or_phoneno: accountOrPhone },
      payment_method: "bank",
      customer,
    }
  );
  return response.data;
};

/**
 * Validate a bank payment with OTP/token.
 */
const validateBankPayment = async ({ transactionReference, otpToken }) => {
  const response = await squadClient.post(
    "/transaction/validate-payment",
    {
      transaction_reference: transactionReference,
      authorization: { otp_token: otpToken },
    }
  );
  return response.data;
};

// ─────────────────────────────────────────────
// BALANCE
// ─────────────────────────────────────────────

/**
 * Get the merchant's Squad ledger balance (returns kobo — divide by 100 for naira).
 */
const getLedgerBalance = async () => {
  const response = await squadClient.get("/merchant/balance");
  return response.data;
};

// ─────────────────────────────────────────────
// WEBHOOK HELPERS
// ─────────────────────────────────────────────

/**
 * Get all missed/failed webhook notifications.
 */
const getWebhookErrorLog = async () => {
  const response = await squadClient.get("/virtual-account/webhook/logs");
  return response.data;
};

/**
 * Delete a webhook error log entry once it has been processed.
 */
const deleteWebhookErrorLog = async (transactionRef) => {
  const response = await squadClient.delete(
    `/virtual-account/webhook/logs/${transactionRef}`
  );
  return response.data;
};

/**
 * Validate an incoming webhook signature (v1 — full payload HMAC).
 * Returns true if the request genuinely came from Squad.
 */
const validateWebhookSignatureV1 = (rawBody, signatureHeader) => {
  const hash = crypto
    .createHmac("sha512", SQUAD.SECRET_KEY)
    .update(rawBody)
    .digest("hex")
    .toUpperCase();
  return hash === signatureHeader?.toUpperCase();
};

/**
 * Validate an incoming webhook signature (v2/v3 — 6-field HMAC).
 * Squad only hashes 6 specific fields separated by pipe.
 */
const validateWebhookSignatureV2 = (payload, signatureHeader) => {
  const sigString = [
    payload.transaction_reference,
    payload.virtual_account_number,
    payload.currency,
    payload.principal_amount,
    payload.settled_amount,
    payload.customer_identifier,
  ].join("|");

  const hash = crypto
    .createHmac("sha512", SQUAD.SECRET_KEY)
    .update(sigString)
    .digest("hex");

  return hash === signatureHeader?.toLowerCase();
};

const getBanks = async () => {
  const response = await squadClient.get("/bank");
  return response.data;
};

/**
 * Create a payment link.
 * Used in /wallet/receive — generates a shareable link, no recipient app needed.
 */
const createPaymentLink = async ({
  amount,
  email,
  currency = "NGN",
  transactionReference,
  redirectUrl,
}) => {
  const response = await squadClient.post("/transaction/initiate", {
    amount: String(amount),
    email,
    currency,
    initiate_type: "inline",
    transaction_ref: transactionReference,
    callback_url: redirectUrl,
  });

  return response.data;
};

module.exports = {
  // Virtual accounts
  createVirtualAccount,
  createBusinessVirtualAccount,
  getCustomerByVirtualAccount,
  getCustomerByIdentifier,
  getCustomerTransactions,
  getAllMerchantTransactions,
  getAllMerchantVirtualAccounts,
  simulatePayment,
  // Transfers
  lookupAccount,
  transferFunds,
  requeryTransfer,
  getAllTransfers,
  // Direct payments
  chargeCard,
  authorizePayment,
  initiateUssdPayment,
  initiateDirectBankDebit,
  validateBankPayment,
  // Payment links
  createPaymentLink,
  // Balance
  getLedgerBalance,
  // Webhooks
  getWebhookErrorLog,
  deleteWebhookErrorLog,
  validateWebhookSignatureV1,
  validateWebhookSignatureV2,
};