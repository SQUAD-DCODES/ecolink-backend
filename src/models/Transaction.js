const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionRef: { type: String, required: true, unique: true, index: true },
    gatewayRef: { type: String },
    virtualAccountNumber: { type: String, index: true },
    customerIdentifier: { type: String, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    amount: { type: Number, required: true },
    merchantAmount: { type: Number },
    feeCharged: { type: Number, default: 0 },
    currency: { type: String, default: "NGN" },

    transactionType: {
      type: String,
      enum: ["Card", "Transfer", "Bank", "Ussd", "MerchantUssd", "VirtualAccount"],
      required: true,
    },
    transactionStatus: { type: String, default: "Success" },

    purpose: {
      type: String,
      enum: ["ajo_contribution", "loan_repayment", "gig_payment", "marketplace", "deposit", "other"],
      default: "other",
    },

    rawWebhookData: { type: mongoose.Schema.Types.Mixed },
    squadTransactionDate: { type: Date },
    isRecurring: { type: Boolean, default: false },
    senderName: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);