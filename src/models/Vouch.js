const mongoose = require("mongoose");

const vouchSchema = new mongoose.Schema(
  {
    // Who gave the vouch
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    voucherPhone: { type: String },

    // Who received the vouch
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientCustomerIdentifier: { type: String },

    // Voice note details
    audioUrl: { type: String },           // stored audio file URL
    durationSeconds: { type: Number },
    language: {
      type: String,
      enum: ["pidgin", "yoruba", "igbo", "hausa", "english"],
      default: "pidgin",
    },

    // AI-extracted signals (populated after processing)
    aiProcessed: { type: Boolean, default: false },
    aiProcessedAt: { type: Date },
    extractedSignals: {
      reliability: { type: Number, min: 0, max: 10 },    // pays back debts
      honesty: { type: Number, min: 0, max: 10 },        // trustworthy
      workEthic: { type: Number, min: 0, max: 10 },      // shows up, delivers
      communityStanding: { type: Number, min: 0, max: 10 }, // respected
      overallScore: { type: Number, min: 0, max: 10 },
    },
    aiTranscript: { type: String },
    aiSummary: { type: String },          // one-line summary in English

    // Credibility of the voucher (updated over time)
    voucherCredibilityScore: { type: Number, default: 5 },

    status: {
      type: String,
      enum: ["pending", "processed", "flagged"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vouch", vouchSchema);