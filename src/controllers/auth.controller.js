const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const CreditProfile = require("../models/CreditProfile");
const { JWT_SECRET } = require("../config");
const { success, error, generateCustomerIdentifier } = require("../utils/helpers");

const signToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const register = async (req, res, next) => {
  try {
    const { phone, firstName, lastName, businessType, state, lga } = req.body;

    if (!phone) return error(res, "Phone number is required", 400);

    const existing = await User.findOne({ phone });
    if (existing && existing.isPhoneVerified) {
      return error(res, "An account with this phone number already exists", 409);
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.findOneAndUpdate(
      { phone },
      { phone, firstName, lastName, businessType, state, lga, otpCode: otp, otpExpiresAt, isPhoneVerified: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[Auth] OTP for ${phone}: ${otp}`);

    return success(res, {
      phone,
      userId: user._id,
      otp_dev_only: otp,
    }, "OTP sent to your phone number", 201);

  } catch (err) {
    return error(res, err.message, 500);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone }).select("+otpCode +otpExpiresAt");
    if (!user) return error(res, "No account found for this phone number", 404);

    if (user.otpCode !== otp) return error(res, "Invalid OTP", 400);
    if (new Date() > user.otpExpiresAt) return error(res, "OTP has expired. Request a new one.", 400);

    user.isPhoneVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;

    // Always generate customerIdentifier at verification
    if (!user.customerIdentifier) {
      user.customerIdentifier = generateCustomerIdentifier();
    }

    await user.save();

    const token = signToken(user._id);

    return success(res, {
      token,
      userId: user._id,
      phone: user.phone,
      customerIdentifier: user.customerIdentifier,
    }, "Phone verified successfully");

  } catch (err) {
    return error(res, err.message, 500);
  }
};

const setupPin = async (req, res, next) => {
  try {
    const { pin, skills, languages } = req.body;
    const user = req.user;

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return error(res, "PIN must be exactly 4 digits", 400);
    }

    // Safety net — ensure customerIdentifier always exists
    if (!user.customerIdentifier) {
      user.customerIdentifier = generateCustomerIdentifier();
    }

    const hashedPin = await bcrypt.hash(pin, 12);
    user.pin = hashedPin;
    user.skills = skills || [];
    user.languages = languages || [];
    user.isOnboarded = true;
    await user.save();

    // Upsert credit profile — safe even if it already exists
    await CreditProfile.findOneAndUpdate(
      { user: user._id },
      { $setOnInsert: { user: user._id, customerIdentifier: user.customerIdentifier } },
      { upsert: true, new: true }
    );

    return success(res, { isOnboarded: true }, "PIN set successfully. Account is ready.");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const login = async (req, res, next) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) return error(res, "Phone and PIN are required", 400);

    const user = await User.findOne({ phone }).select("+pin");
    if (!user) return error(res, "No account found for this phone number", 404);
    if (!user.isPhoneVerified) return error(res, "Please verify your phone number first", 403);
    if (!user.pin) return error(res, "PIN not set. Please complete onboarding.", 400);

    const pinMatch = await bcrypt.compare(pin, user.pin);
    if (!pinMatch) return error(res, "Incorrect PIN", 401);

    const token = signToken(user._id);
    user.pin = undefined;

    return success(res, { token, user }, "Login successful");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return error(res, "No account found for this phone number", 404);

    const otp = generateOTP();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`[Auth] Resent OTP for ${phone}: ${otp}`);

    return success(res, { otp_dev_only: otp }, "OTP resent");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return success(res, { user });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = { register, verifyOtp, setupPin, login, resendOtp, getMe };