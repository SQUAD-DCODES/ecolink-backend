const AjoGroup = require("../models/AjoGroup");
const Transaction = require("../models/Transaction");
const squadService = require("../services/squad.service");
const { success, error, generateTransactionRef, nairaToKobo, koboToNaira, extractAxiosError } = require("../utils/helpers");

/**
 * GET /api/savings
 * List all Ajo groups the user belongs to.
 */
const listMyGroups = async (req, res, next) => {
  try {
    const groups = await AjoGroup.find({ "members.user": req.user._id })
      .populate("members.user", "firstName lastName phone creditTier")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });
    return success(res, { groups, count: groups.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/savings/:groupId
 * Group detail — /savings/[groupId].
 */
const getGroup = async (req, res, next) => {
  try {
    const group = await AjoGroup.findById(req.params.groupId)
      .populate("members.user", "firstName lastName phone creditTier virtualAccountNumber")
      .populate("createdBy", "firstName lastName phone")
      .populate("currentBeneficiary", "firstName lastName phone");

    if (!group) return error(res, "Group not found", 404);
    return success(res, group);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/savings
 * Create a new Ajo group — 3-step flow, /savings/create.
 */
const createGroup = async (req, res, next) => {
  try {
    const { name, contributionAmount, frequency, maxMembers, payoutOrder } = req.body;

    const group = await AjoGroup.create({
      name,
      createdBy: req.user._id,
      contributionAmount: nairaToKobo(contributionAmount),
      frequency,
      maxMembers,
      totalCycles: maxMembers,
      members: [
        {
          user: req.user._id,
          customerIdentifier: req.user.customerIdentifier,
          position: 1,
        },
      ],
      status: "open",
    });

    return success(res, group, "Savings group created", 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/savings/:groupId/join
 * Join an existing Ajo group.
 */
const joinGroup = async (req, res, next) => {
  try {
    const group = await AjoGroup.findById(req.params.groupId);
    if (!group) return error(res, "Group not found", 404);
    if (group.status !== "open") return error(res, "This group is no longer accepting members", 400);
    if (group.members.length >= group.maxMembers) return error(res, "This group is full", 400);

    const alreadyMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (alreadyMember) return error(res, "You are already in this group", 409);

    group.members.push({
      user: req.user._id,
      customerIdentifier: req.user.customerIdentifier,
      position: group.members.length + 1,
    });

    if (group.members.length === group.maxMembers) {
      group.status = "active";
      group.currentBeneficiary = group.members[0].user;
    }

    await group.save();
    return success(res, group, "Joined group successfully");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/savings/:groupId/contribute
 * Make a contribution to the group via Squad USSD or card.
 * Auto-deducted via Squad on contribution date.
 */
const contribute = async (req, res, next) => {
  try {
    const { paymentMethod = "ussd", bankCode } = req.body;
    const group = await AjoGroup.findById(req.params.groupId);
    if (!group) return error(res, "Group not found", 404);
    if (group.status !== "active") return error(res, "Group is not active", 400);

    const isMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) return error(res, "You are not a member of this group", 403);

    const transactionReference = generateTransactionRef("AJO");

    let paymentData;
    if (paymentMethod === "ussd") {
      paymentData = await squadService.initiateUssdPayment({
        transactionReference,
        amount: group.contributionAmount,
        bankCode: bankCode || "058",
        customer: {
          name: req.user.fullName || req.user.phone,
          email: req.user.email || `${req.user.customerIdentifier}@ecolink.app`,
        },
        webhookUrl: `${process.env.BACKEND_URL}/api/webhooks/squad`,
      });
    }

    // Mark contribution as pending — webhook will confirm it
    group.contributions.push({
      user: req.user._id,
      customerIdentifier: req.user.customerIdentifier,
      cycleNumber: group.currentCycle,
      amountPaid: group.contributionAmount,
      transactionRef: transactionReference,
      status: "pending",
    });

    group.totalCollected += group.contributionAmount;
    await group.save();

    return success(res, {
      transactionReference,
      amount: koboToNaira(group.contributionAmount),
      paymentData,
    }, "Contribution initiated");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

/**
 * POST /api/savings/:groupId/disburse
 * Disburse pot to current beneficiary via Squad transfer.
 * Called programmatically on payout date.
 */
const disburse = async (req, res, next) => {
  try {
    const group = await AjoGroup.findById(req.params.groupId)
      .populate("currentBeneficiary");

    if (!group) return error(res, "Group not found", 404);
    if (group.status !== "active") return error(res, "Group is not active", 400);
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return error(res, "Only the group creator can trigger disbursement", 403);
    }

    const beneficiary = group.currentBeneficiary;
    if (!beneficiary?.virtualAccountNumber) {
      return error(res, "Beneficiary has no wallet account", 400);
    }

    const potAmount = group.contributionAmount * group.members.length;
    const transactionReference = generateTransactionRef("AJOPOT");

    await squadService.transferFunds({
      bankCode: beneficiary.bankCode || "058",
      accountNumber: beneficiary.virtualAccountNumber,
      accountName: beneficiary.fullName || beneficiary.phone,
      amount: potAmount,
      remark: `Ajo payout: ${group.name} - Cycle ${group.currentCycle}`,
      transactionReference,
    });

    // Advance to next cycle
    const currentBeneficiaryIndex = group.members.findIndex(
      (m) => m.user.toString() === beneficiary._id.toString()
    );
    group.members[currentBeneficiaryIndex].hasReceivedPot = true;

    const nextIndex = currentBeneficiaryIndex + 1;
    if (nextIndex < group.members.length) {
      group.currentBeneficiary = group.members[nextIndex].user;
      group.currentCycle += 1;
    } else {
      group.status = "completed";
    }

    await group.save();

    return success(res, {
      transactionReference,
      beneficiary: beneficiary.fullName || beneficiary.phone,
      amountNaira: koboToNaira(potAmount),
    }, "Pot disbursed successfully");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

module.exports = { listMyGroups, getGroup, createGroup, joinGroup, contribute, disburse };