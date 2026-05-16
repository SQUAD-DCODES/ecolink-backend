const mongoose = require("mongoose");

const vouchSchema = new mongoose.Schema(
  {
    // Who gave the vouch
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    voucherUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    voucherPhone: { type: String },

    // Who received the vouch
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recipientPhone: { type: String },
    recipientCustomerIdentifier: { type: String },

    // Voice note details
    audioUrl: { type: String },           // stored audio file URL
    durationSeconds: { type: Number },
    language: {
      type: String,
      enum: ["pidgin", "yoruba", "igbo", "hausa", "english"],
      default: "pidgin",
    },

    transcript: { type: String },

    // AI-extracted signals (populated after processing)
    aiProcessed: { type: Boolean, default: false },
    aiProcessedAt: { type: Date },
    signals: [
      {
        label: { type: String },
        score: { type: Number, min: 0, max: 100 },
        evidence: { type: String },
      },
    ],
    trustScore: { type: Number, min: 0, max: 100 },
    trustLevel: { type: String, enum: ["Community", "Verified", "Trusted"], default: "Community" },
    confidence: { type: Number, min: 0, max: 1 },
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