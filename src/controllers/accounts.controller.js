const squadService = require("../services/squad.service");
const User = require("../models/User");
const CreditProfile = require("../models/CreditProfile");
const Transaction = require("../models/Transaction");
const { success, error, generateCustomerIdentifier, extractAxiosError } = require("../utils/helpers");

const createIndividualAccount = async (req, res, next) => {
  try {
    const { firstName, lastName, mobileNum, email, bvn, dob, address, gender, beneficiaryAccount } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return error(res, "User with this email already exists", 409);

    const customerIdentifier = generateCustomerIdentifier();

    const squadData = await squadService.createVirtualAccount({
      customerIdentifier, firstName, lastName, mobileNum,
      email, bvn, dob, address, gender, beneficiaryAccount,
    });

    const user = await User.create({
      customerIdentifier,
      accountType: "individual",
      firstName, lastName, email,
      phone: mobileNum,
      gender, dob, address, bvn,
      virtualAccountNumber: squadData?.data?.virtual_account_number,
      bankCode: squadData?.data?.bank_code,
      isOnboarded: true,
    });

    await CreditProfile.create({ user: user._id, customerIdentifier });

    return success(res, {
      customerIdentifier,
      virtualAccountNumber: user.virtualAccountNumber,
      userId: user._id,
      squadResponse: squadData,
    }, "Account created successfully", 201);

  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

const createBusinessAccount = async (req, res, next) => {
  try {
    const { businessName, mobileNum, email, bvn, beneficiaryAccount } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return error(res, "Account with this email already exists", 409);

    const customerIdentifier = generateCustomerIdentifier();

    const squadData = await squadService.createBusinessVirtualAccount({
      customerIdentifier, businessName, mobileNum, bvn, beneficiaryAccount,
    });

    const user = await User.create({
      customerIdentifier,
      accountType: "business",
      businessName, email,
      phone: mobileNum,
      bvn,
      virtualAccountNumber: squadData?.data?.virtual_account_number,
      bankCode: squadData?.data?.bank_code,
      roles: ["trader"],
      isOnboarded: true,
    });

    await CreditProfile.create({ user: user._id, customerIdentifier });

    return success(res, {
      customerIdentifier,
      virtualAccountNumber: user.virtualAccountNumber,
      userId: user._id,
      squadResponse: squadData,
    }, "Business account created", 201);

  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

const getAccountByIdentifier = async (req, res, next) => {
  try {
    const { customerIdentifier } = req.params;
    const user = await User.findOne({ customerIdentifier });
    if (!user) return error(res, "User not found", 404);
    const creditProfile = await CreditProfile.findOne({ user: user._id });
    return success(res, { user, creditProfile });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getAccountByVirtualNumber = async (req, res, next) => {
  try {
    const { virtualAccountNumber } = req.params;
    const user = await User.findOne({ virtualAccountNumber });
    if (!user) return error(res, "Account not found", 404);
    return success(res, user);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getAccountTransactions = async (req, res, next) => {
  try {
    const { customerIdentifier } = req.params;
    const transactions = await Transaction.find({ customerIdentifier })
      .sort({ createdAt: -1 })
      .limit(100);
    return success(res, { transactions, count: transactions.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getAllAccounts = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100);
    return success(res, { users, count: users.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const simulatePayment = async (req, res, next) => {
  try {
    const { virtualAccountNumber, amount } = req.body;
    const data = await squadService.simulatePayment({ virtualAccountNumber, amount });
    return success(res, data, "Payment simulated");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

module.exports = {
  createIndividualAccount,
  createBusinessAccount,
  getAccountByIdentifier,
  getAccountByVirtualNumber,
  getAccountTransactions,
  getAllAccounts,
  simulatePayment,
};