const mongoose = require("mongoose");

const repaymentSchema = new mongoose.Schema({
  amountPaid: { type: Number },
  transactionRef: { type: String },
  paidAt: { type: Date },
  balanceAfter: { type: Number },
});

const loanSchema = new mongoose.Schema(
  {
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerIdentifier: { type: String, required: true },
    principalAmount: { type: Number, required: true },
    interestRate: { type: Number, default: 5 },
    totalRepayable: { type: Number },
    balanceRemaining: { type: Number },
    durationDays: { type: Number, required: true },
    dueDate: { type: Date },
    disbursementRef: { type: String },
    disbursedAt: { type: Date },
    isDisbursed: { type: Boolean, default: false },
    repayments: [repaymentSchema],
    status: {
      type: String,
      enum: ["pending", "approved", "disbursed", "repaying", "completed", "defaulted"],
      default: "pending",
    },
    creditTierAtApplication: { type: String },
    creditScoreAtApplication: { type: Number },
    guarantors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

loanSchema.pre("save", function (next) {
  if (this.isNew) {
    const interest = (this.principalAmount * this.interestRate) / 100;
    this.totalRepayable = this.principalAmount + interest;
    this.balanceRemaining = this.totalRepayable;
    this.dueDate = new Date(Date.now() + this.durationDays * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("Loan", loanSchema);