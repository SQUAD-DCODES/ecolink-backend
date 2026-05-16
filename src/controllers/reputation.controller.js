const Vouch = require("../models/Vouch");
const User = require("../models/User");
const { success, error } = require("../utils/helpers");
const { computeReputationFromVouches } = require("../services/reputation.service");

const buildVoucherName = (voucher) => {
  if (!voucher) return null;
  if (voucher.businessName) return voucher.businessName;
  const first = voucher.firstName || "";
  const last = voucher.lastName || "";
  const name = `${first} ${last}`.trim();
  return name || voucher.phone || null;
};

const mapRecentVouches = (vouches, limit = 6) => {
  return vouches.slice(0, limit).map((vouch) => ({
    voucherName: buildVoucherName(vouch.voucher),
    language: vouch.language,
    aiSummary: vouch.aiSummary || null,
    transcript: vouch.aiTranscript || vouch.transcript || null,
    createdAt: vouch.createdAt,
  }));
};

const getMyReputation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const vouches = await Vouch.find({ recipient: userId, status: "processed" })
      .populate("voucher", "firstName lastName businessName phone")
      .sort({ createdAt: -1 });

    const aggregate = computeReputationFromVouches(vouches);

    await User.findByIdAndUpdate(userId, {
      reputationScore: aggregate.overallScore,
      reputationTier: aggregate.tier,
      vouchCount: aggregate.vouchCount,
      lastReputationUpdatedAt: new Date(),
    });

    return success(res, {
      overallScore: aggregate.overallScore,
      tier: aggregate.tier,
      vouchCount: aggregate.vouchCount,
      aiSignals: aggregate.signals,
      recentVouches: mapRecentVouches(vouches),
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getUserReputation = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return error(res, "User not found", 404);

    const vouches = await Vouch.find({ recipient: userId, status: "processed" })
      .populate("voucher", "firstName lastName businessName phone")
      .sort({ createdAt: -1 });

    const aggregate = computeReputationFromVouches(vouches);

    return success(res, {
      overallScore: aggregate.overallScore,
      tier: aggregate.tier,
      vouchCount: aggregate.vouchCount,
      aiSignals: aggregate.signals,
      recentVouches: mapRecentVouches(vouches),
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { getMyReputation, getUserReputation };
