const CreditProfile = require("../models/CreditProfile");
const Loan = require("../models/Loan");
const Transaction = require("../models/Transaction");
const squadService = require("../services/squad.service");
const { success, error, generateTransactionRef, nairaToKobo, koboToNaira, extractAxiosError } = require("../utils/helpers");

const getCreditScore = async (req, res, next) => {
  try {
    const user = req.user;

    let profile = await CreditProfile.findOne({ user: user._id });

    if (!profile) {
      // If no customerIdentifier yet, return safe zero profile — never crash
      if (!user.customerIdentifier) {
        return success(res, {
          score: 0,
          tier: "unscored",
          maxLoanNaira: "0.00",
          factors: {
            paymentReliability: { label: "Payment Reliability", score: 0, weight: 35 },
            vocalReputation: { label: "Vocal Reputation", score: 0, weight: 25 },
            savingsConsistency: { label: "Savings Consistency", score: 0, weight: 20 },
            gigCompletion: { label: "Gig Completion", score: 0, weight: 10 },
            identityVerification: { label: "Identity Verified", score: 0, weight: 10 },
          },
          totalTransactions: 0,
          lastUpdated: null,
          scoreHistory: [],
        });
      }

      // Create profile for users who completed onboarding before this fix
      profile = await CreditProfile.create({
        user: user._id,
        customerIdentifier: user.customerIdentifier,
      });
    }

    const factors = {
      paymentReliability: {
        label: "Payment Reliability",
        score: Math.min(100, profile.onTimeRepaymentRate || 0),
        weight: 35,
      },
      vocalReputation: {
        label: "Vocal Reputation",
        score: Math.min(100, (profile.vouchScore || 0) * 10),
        weight: 25,
      },
      savingsConsistency: {
        label: "Savings Consistency",
        score: Math.min(100, profile.ajoReliabilityRate || 0),
        weight: 20,
      },
      gigCompletion: {
        label: "Gig Completion",
        score: Math.min(100, profile.gigCompletionRate || 0),
        weight: 10,
      },
      identityVerification: {
        label: "Identity Verified",
        score: user.kycStatus === "verified" ? 100 : 0,
        weight: 10,
      },
    };

    return success(res, {
      score: Math.round(profile.score),
      tier: profile.tier,
      maxLoanNaira: koboToNaira(profile.maxLoanEligibleKobo),
      factors,
      totalTransactions: profile.totalTransactions,
      lastUpdated: profile.lastCalculatedAt,
      scoreHistory: profile.scoreHistory.slice(-10),
    });
  } catch (err) {
    console.error("[Credit] getCreditScore error:", err.message);
    return error(res, err.message, 500);
  }
};

const getLoanOffers = async (req, res, next) => {
  try {
    const profile = await CreditProfile.findOne({ user: req.user._id });

    // Return empty offers instead of 404 if no profile
    if (!profile) {
      return success(res, { tier: "unscored", offers: [] });
    }

    const offers = {
      unscored: [],
      bronze: [
        { name: "Starter Loan", amount: 5000, interestRate: 8, durationDays: 30, partner: "EcoLink Credit" },
      ],
      silver: [
        { name: "Growth Loan", amount: 50000, interestRate: 6, durationDays: 60, partner: "NIRSAL MFB" },
        { name: "Starter Loan", amount: 5000, interestRate: 8, durationDays: 30, partner: "EcoLink Credit" },
      ],
      gold: [
        { name: "Business Loan", amount: 150000, interestRate: 5, durationDays: 90, partner: "NIRSAL MFB" },
        { name: "Growth Loan", amount: 50000, interestRate: 6, durationDays: 60, partner: "NIRSAL MFB" },
      ],
      platinum: [
        { name: "Enterprise Loan", amount: 500000, interestRate: 4, durationDays: 180, partner: "Bank of Industry" },
        { name: "Business Loan", amount: 150000, interestRate: 5, durationDays: 90, partner: "NIRSAL MFB" },
      ],
    };

    return success(res, {
      tier: profile.tier,
      offers: offers[profile.tier] || [],
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const applyForLoan = async (req, res, next) => {
  try {
    const { amount, purpose, durationDays } = req.body;
    const user = req.user;

    const profile = await CreditProfile.findOne({ user: user._id });
    if (!profile) return error(res, "Complete onboarding to access credit", 400);
    if (profile.tier === "unscored") return error(res, "Build your credit score first by completing transactions", 400);

    const amountKobo = nairaToKobo(amount);
    if (amountKobo > profile.maxLoanEligibleKobo) {
      return error(res, `Maximum loan for your tier is ₦${koboToNaira(profile.maxLoanEligibleKobo)}`, 400);
    }

    const activeLoan = await Loan.findOne({
      borrower: user._id,
      status: { $in: ["approved", "disbursed", "repaying"] },
    });
    if (activeLoan) return error(res, "You have an active loan. Repay it before applying for another.", 400);

    const loan = await Loan.create({
      borrower: user._id,
      customerIdentifier: user.customerIdentifier,
      principalAmount: amountKobo,
      durationDays,
      creditTierAtApplication: profile.tier,
      creditScoreAtApplication: profile.score,
      status: "approved",
    });

    return success(res, {
      loanId: loan._id,
      principal: amount,
      totalRepayable: koboToNaira(loan.totalRepayable),
      dueDate: loan.dueDate,
      status: loan.status,
    }, "Loan application approved", 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const disburseLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.loanId).populate("borrower");
    if (!loan) return error(res, "Loan not found", 404);
    if (loan.status !== "approved") return error(res, "Loan is not in approved state", 400);

    const borrower = loan.borrower;
    if (!borrower.virtualAccountNumber) {
      return error(res, "Borrower has no wallet. Complete onboarding first.", 400);
    }

    const ref = generateTransactionRef("LOAN");

    await squadService.transferFunds({
      bankCode: borrower.bankCode || "058",
      accountNumber: borrower.virtualAccountNumber,
      accountName: borrower.fullName || borrower.phone,
      amount: loan.principalAmount,
      remark: "EcoLink micro-loan disbursement",
      transactionReference: ref,
    });

    loan.disbursementRef = ref;
    loan.disbursedAt = new Date();
    loan.isDisbursed = true;
    loan.status = "disbursed";
    await loan.save();

    return success(res, {
      disbursementRef: ref,
      amountNaira: koboToNaira(loan.principalAmount),
      dueDate: loan.dueDate,
    }, "Loan disbursed to wallet");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

const getMyLoans = async (req, res, next) => {
  try {
    const loans = await Loan.find({ borrower: req.user._id }).sort({ createdAt: -1 });
    return success(res, { loans, count: loans.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { getCreditScore, getLoanOffers, applyForLoan, disburseLoan, getMyLoans };