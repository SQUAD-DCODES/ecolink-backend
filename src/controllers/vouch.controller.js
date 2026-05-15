const Vouch = require("../models/Vouch");
const User = require("../models/User");
const CreditProfile = require("../models/CreditProfile");
const { success, error } = require("../utils/helpers");
const { analyzeVouchTranscript } = require("../services/grok.service");
const { updateUserReputation } = require("../services/reputation.service");

const average = (values) => {
  if (!values.length) return 0;
  const sum = values.reduce((total, val) => total + val, 0);
  return sum / values.length;
};

/**
 * POST /api/vouch
 * Submit a vocal vouch for another user — /vouch/record.
 */
const submitVouch = async (req, res, next) => {
  try {
    const { recipientPhone, audioUrl, durationSeconds, language, transcript } = req.body;

    if (!recipientPhone) return error(res, "Recipient phone is required", 400);
    if (!audioUrl) return error(res, "Audio URL is required", 400);

    const recipient = await User.findOne({ phone: recipientPhone });
    if (!recipient) return error(res, "User not found with that phone number", 404);

    if (recipient._id.toString() === req.user._id.toString()) {
      return error(res, "You cannot vouch for yourself", 400);
    }

    // Prevent duplicate vouches
    const existing = await Vouch.findOne({
      voucher: req.user._id,
      recipient: recipient._id,
    });
    if (existing) return error(res, "You have already vouched for this person", 409);

    const vouch = await Vouch.create({
      voucher: req.user._id,
      voucherUserId: req.user._id,
      voucherPhone: req.user.phone,
      recipient: recipient._id,
      recipientUserId: recipient._id,
      recipientPhone: recipient.phone,
      recipientCustomerIdentifier: recipient.customerIdentifier,
      audioUrl,
      durationSeconds,
      language: language || "pidgin",
      status: "pending",
    });

    // Bump recipient's vouch count on credit profile
    await CreditProfile.findOneAndUpdate(
      { user: recipient._id },
      { $inc: { vouchesReceived: 1 } }
    );

    const analysis = await analyzeVouchTranscript(transcript || "");
    const baseScore = Math.round(average((analysis.signals || []).map((s) => s.score)));

    vouch.signals = analysis.signals;
    vouch.aiSummary = analysis.summary;
    vouch.aiTranscript = analysis.transcript;
    vouch.transcript = analysis.transcript;
    vouch.trustLevel = analysis.trustLevel;
    vouch.confidence = analysis.confidence;
    vouch.trustScore = Number.isFinite(baseScore) ? baseScore : 0;
    vouch.aiProcessed = true;
    vouch.aiProcessedAt = new Date();
    vouch.status = "processed";
    await vouch.save();

    await updateUserReputation(recipient._id);

    return success(res, {
      vouchId: vouch._id,
      recipient: recipient.fullName || recipient.phone,
      status: vouch.status,
      trustLevel: vouch.trustLevel,
      trustScore: vouch.trustScore,
    }, "Vouch recorded", 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/vouch/received
 * Get all vouches received by the logged-in user — /profile/reputation.
 */
const getReceivedVouches = async (req, res, next) => {
  try {
    const vouches = await Vouch.find({ recipient: req.user._id })
      .populate("voucher", "firstName lastName phone businessType")
      .sort({ createdAt: -1 });

    return success(res, { vouches, count: vouches.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/vouch/given
 * Get all vouches the user has given.
 */
const getGivenVouches = async (req, res, next) => {
  try {
    const vouches = await Vouch.find({ voucher: req.user._id })
      .populate("recipient", "firstName lastName phone businessType")
      .sort({ createdAt: -1 });

    return success(res, { vouches, count: vouches.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/vouch/user/:userId
 * Get all vouches for a specific user — shown on job detail page.
 */
const getUserVouches = async (req, res, next) => {
  try {
    const vouches = await Vouch.find({
      recipient: req.params.userId,
      status: "processed",
    })
      .populate("voucher", "firstName lastName businessType creditTier")
      .sort({ createdAt: -1 })
      .limit(10);

    return success(res, { vouches, count: vouches.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { submitVouch, getReceivedVouches, getGivenVouches, getUserVouches };