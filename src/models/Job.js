const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  coverNote: { type: String },
  status: {
    type: String,
    enum: ["pending", "shortlisted", "hired", "rejected"],
    default: "pending",
  },
  appliedAt: { type: Date, default: Date.now },
});

const jobSchema = new mongoose.Schema(
  {
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },

    // AI matching fields — mirrors frontend filter chips
    skills: [{ type: String }],
    languages: [{ type: String }],
    state: { type: String },
    lga: { type: String },

    jobType: {
      type: String,
      enum: ["gig", "part-time", "full-time", "contract"],
      default: "gig",
    },
    category: {
      type: String,
      enum: ["artisan", "trade", "delivery", "domestic", "tech", "other"],
      default: "other",
    },

    // Pay
    payAmount: { type: Number },   // kobo
    payFrequency: {
      type: String,
      enum: ["per_job", "daily", "weekly", "monthly"],
      default: "per_job",
    },

    // Escrow — matches frontend "escrow toggle" in post job step 2
    escrowEnabled: { type: Boolean, default: false },
    escrowRef: { type: String },         // Squad escrow reference
    escrowStatus: {
      type: String,
      enum: ["none", "locked", "released", "refunded"],
      default: "none",
    },
    escrowLockedAt: { type: Date },
    escrowReleasedAt: { type: Date },

    // Status lifecycle
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "cancelled"],
      default: "open",
    },

    hiredApplicant: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    applications: [applicationSchema],

    // Payment
    paymentRef: { type: String },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ skills: 1, state: 1, status: 1 });
jobSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model("Job", jobSchema);