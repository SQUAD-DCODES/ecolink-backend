const mongoose = require("mongoose");

const creditProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    customerIdentifier: { type: String, required: true, unique: true },
    score: { type: Number, default: 0, min: 0, max: 850 },
    tier: {
      type: String,
      enum: ["unscored", "bronze", "silver", "gold", "platinum"],
      default: "unscored",
    },
    totalTransactions: { type: Number, default: 0 },
    totalVolumeKobo: { type: Number, default: 0 },
    avgMonthlyVolumeKobo: { type: Number, default: 0 },
    lastTransactionAt: { type: Date },
    transactionStreakDays: { type: Number, default: 0 },
    ajoGroupsJoined: { type: Number, default: 0 },
    ajoContributionsMade: { type: Number, default: 0 },
    ajoContributionsMissed: { type: Number, default: 0 },
    ajoReliabilityRate: { type: Number, default: 0 },
    loansCompleted: { type: Number, default: 0 },
    loansDefaulted: { type: Number, default: 0 },
    onTimeRepaymentRate: { type: Number, default: 0 },
    gigsCompleted: { type: Number, default: 0 },
    gigCompletionRate: { type: Number, default: 0 },
    totalCheckIns: { type: Number, default: 0 },
    checkInStreakDays: { type: Number, default: 0 },
    lastCheckInAt: { type: Date },
    vouchesReceived: { type: Number, default: 0 },
    vouchScore: { type: Number, default: 0 },
    maxLoanEligibleKobo: { type: Number, default: 0 },
    scoreHistory: [
      {
        score: Number,
        tier: String,
        recordedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    lastCalculatedAt: { type: Date },
  },
  { timestamps: true }
);

creditProfileSchema.methods.recalculateTier = function () {
  const s = this.score;
  if (s === 0) {
    this.tier = "unscored";
    this.maxLoanEligibleKobo = 0;
  } else if (s < 300) {
    this.tier = "bronze";
    this.maxLoanEligibleKobo = 500000;
  } else if (s < 500) {
    this.tier = "silver";
    this.maxLoanEligibleKobo = 5000000;
  } else if (s < 700) {
    this.tier = "gold";
    this.maxLoanEligibleKobo = 15000000;
  } else {
    this.tier = "platinum";
    this.maxLoanEligibleKobo = 50000000;
  }
};

module.exports = mongoose.model("CreditProfile", creditProfileSchema);