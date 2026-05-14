const squadService = require("../services/squad.service");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const CreditProfile = require("../models/CreditProfile");
const { success, error, koboToNaira } = require("../utils/helpers");

const handleSquadWebhook = async (req, res, next) => {
  try {
    const body = req.body;
    const event = body?.Event || body?.event;
    const txBody = body?.Body || body?.body;
    const txRef = body?.TransactionRef || txBody?.transaction_ref;

    // Duplicate guard — checked against DB
    const existing = await Transaction.findOne({ transactionRef: txRef });
    if (existing) {
      console.warn(`[Webhook] Duplicate ignored: ${txRef}`);
      return res.status(200).json({
        response_code: 200,
        transaction_reference: txRef,
        response_description: "Already processed",
      });
    }

    if (event !== "charge_successful") {
      return res.status(200).json({
        response_code: 200,
        transaction_reference: txRef,
        response_description: "Event acknowledged",
      });
    }

    const {
      amount, transaction_type, merchant_amount, fee_charged,
      email, currency, created_at, gateway_ref, is_recurring,
      remarks, sender_name, customer_identifier, virtual_account_number,
    } = txBody;

    // Find the user this payment belongs to
    let user = null;
    if (customer_identifier) {
      user = await User.findOne({ customerIdentifier: customer_identifier });
    } else if (virtual_account_number) {
      user = await User.findOne({ virtualAccountNumber: virtual_account_number });
    } else if (email) {
      user = await User.findOne({ email });
    }

    // Save transaction
    await Transaction.create({
      transactionRef: txRef,
      gatewayRef: gateway_ref,
      virtualAccountNumber: virtual_account_number,
      customerIdentifier: customer_identifier,
      user: user?._id,
      amount,
      merchantAmount: merchant_amount,
      feeCharged: fee_charged || 0,
      currency: currency || "NGN",
      transactionType: transaction_type,
      transactionStatus: "Success",
      squadTransactionDate: created_at ? new Date(created_at) : new Date(),
      isRecurring: is_recurring || false,
      senderName: sender_name,
      remarks,
      rawWebhookData: body,
    });

    console.log(`[Webhook] ✅ ${transaction_type} ₦${koboToNaira(amount)} saved — ${txRef}`);

    // Update credit signals
    if (user) await updateCreditSignals(user, amount);

    return res.status(200).json({
      response_code: 200,
      transaction_reference: txRef,
      response_description: "Success",
    });

  } catch (err) {
    console.error("[Webhook] Error:", err.message);
    return res.status(200).json({
      response_code: 500,
      response_description: "Processing error logged",
    });
  }
};

const updateCreditSignals = async (user, amountKobo) => {
  try {
    let profile = await CreditProfile.findOne({ user: user._id });
    if (!profile) {
      profile = new CreditProfile({
        user: user._id,
        customerIdentifier: user.customerIdentifier,
      });
    }

    profile.totalTransactions += 1;
    profile.totalVolumeKobo += amountKobo;
    profile.lastTransactionAt = new Date();

    const scoreBump = Math.min(amountKobo / 100000, 10);
    const previousScore = profile.score;
    profile.score = Math.min(850, profile.score + scoreBump);
    profile.recalculateTier();
    profile.lastCalculatedAt = new Date();

    if (Math.floor(profile.score) !== Math.floor(previousScore)) {
      profile.scoreHistory.push({
        score: profile.score,
        tier: profile.tier,
        reason: "transaction_completed",
      });
    }

    await profile.save();

    await User.findByIdAndUpdate(user._id, {
      creditScore: profile.score,
      creditTier: profile.tier,
    });

    console.log(`[Credit] ${user.customerIdentifier}: score ${Math.floor(profile.score)} (${profile.tier})`);
  } catch (err) {
    console.error("[Credit] Update failed:", err.message);
  }
};

const getWebhookErrors = async (req, res, next) => {
  try {
    const data = await squadService.getWebhookErrorLog();
    return success(res, data, "Webhook error log retrieved");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const clearWebhookError = async (req, res, next) => {
  try {
    const { transactionRef } = req.params;
    const data = await squadService.deleteWebhookErrorLog(transactionRef);
    return success(res, data, "Webhook error cleared");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { handleSquadWebhook, getWebhookErrors, clearWebhookError };