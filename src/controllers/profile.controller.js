const User = require("../models/User");
const CreditProfile = require("../models/CreditProfile");
const { success, error } = require("../utils/helpers");

/**
 * GET /api/profile
 * Get logged-in user's full profile — /profile page.
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const creditProfile = await CreditProfile.findOne({ user: user._id });
    return success(res, { user, creditProfile });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * PATCH /api/profile
 * Edit profile — /profile/edit.
 * Name, bio, business type, skills, location.
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowed = [
      "firstName", "lastName", "businessName", "bio",
      "businessType", "skills", "languages",
      "state", "lga", "address", "email",
    ];

    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    return success(res, user, "Profile updated");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/profile/kyc
 * Submit KYC document — /profile/kyc.
 * Step: ID type + document URL + selfie URL.
 */
const submitKyc = async (req, res, next) => {
  try {
    const { documentType, documentUrl, selfieUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        kycStatus: "pending",
        kycDocumentType: documentType,
        kycDocumentUrl: documentUrl,
        kycSelfieUrl: selfieUrl,
        kycSubmittedAt: new Date(),
      },
      { new: true }
    );

    return success(res, {
      kycStatus: user.kycStatus,
      submittedAt: user.kycSubmittedAt,
    }, "KYC submitted for review");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/profile/checkin
 * Daily Hustle Check-in — user taps Good / Okay / Slow.
 * Updates credit profile activity signal.
 */
const dailyCheckIn = async (req, res, next) => {
  try {
    const { mood } = req.body; // "good" | "okay" | "slow"
    if (!["good", "okay", "slow"].includes(mood)) {
      return error(res, "Mood must be good, okay, or slow", 400);
    }

    const profile = await CreditProfile.findOne({ user: req.user._id });
    if (!profile) return error(res, "Credit profile not found", 404);

    const today = new Date().toDateString();
    const lastCheckIn = profile.lastCheckInAt?.toDateString();

    if (lastCheckIn === today) {
      return error(res, "You have already checked in today", 400);
    }

    profile.totalCheckIns += 1;
    profile.lastCheckInAt = new Date();

    // Streak logic
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastCheckIn === yesterday) {
      profile.checkInStreakDays += 1;
    } else {
      profile.checkInStreakDays = 1;
    }

    // Small score bump for consistency
    const bump = mood === "good" ? 2 : mood === "okay" ? 1 : 0.5;
    profile.score = Math.min(850, profile.score + bump);
    profile.recalculateTier();

    await profile.save();

    // Surface help if slow 3 days running
    let suggestion = null;
    if (mood === "slow" && profile.checkInStreakDays >= 1) {
      suggestion = {
        type: "gig",
        message: "Business slow? There are gigs near you that match your skills.",
        action: "/jobs",
      };
    }

    return success(res, {
      mood,
      streak: profile.checkInStreakDays,
      totalCheckIns: profile.totalCheckIns,
      suggestion,
    }, "Check-in recorded");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { getProfile, updateProfile, submitKyc, dailyCheckIn };