const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerIdentifier: { type: String },
  position: { type: Number },
  hasReceivedPot: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
});

const contributionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  customerIdentifier: { type: String },
  cycleNumber: { type: Number },
  amountPaid: { type: Number },
  transactionRef: { type: String },
  paidAt: { type: Date },
  status: { type: String, enum: ["pending", "paid", "missed"], default: "pending" },
});

const ajoGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contributionAmount: { type: Number, required: true },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    maxMembers: { type: Number, required: true },
    members: [memberSchema],
    contributions: [contributionSchema],
    status: {
      type: String,
      enum: ["open", "active", "completed", "cancelled"],
      default: "open",
    },
    currentCycle: { type: Number, default: 1 },
    totalCycles: { type: Number },
    nextContributionDate: { type: Date },
    currentBeneficiary: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    totalCollected: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AjoGroup", ajoGroupSchema);