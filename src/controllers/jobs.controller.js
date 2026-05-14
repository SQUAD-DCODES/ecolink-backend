const Job = require("../models/Job");
const User = require("../models/User");
const squadService = require("../services/squad.service");
const { success, error, generateTransactionRef, nairaToKobo, extractAxiosError } = require("../utils/helpers");

/**
 * GET /api/jobs
 * AI-matched job listings. Scores each job against user's skills + location.
 * Mirrors the match score bars on the frontend /jobs page.
 */
const listJobs = async (req, res, next) => {
  try {
    const user = req.user;
    const { category, state, jobType, page = 1, limit = 20 } = req.query;

    const filter = { status: "open" };
    if (category) filter.category = category;
    if (state) filter.state = state;
    if (jobType) filter.jobType = jobType;

    const jobs = await Job.find(filter)
      .populate("postedBy", "firstName lastName businessName creditTier")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // AI match score — how well job matches user's skills and location
    const scoredJobs = jobs.map((job) => {
      const jobObj = job.toObject();
      let matchScore = 0;

      // Skill overlap
      const userSkills = user.skills || [];
      const jobSkills = job.skills || [];
      const overlap = jobSkills.filter((s) => userSkills.includes(s)).length;
      if (jobSkills.length > 0) matchScore += (overlap / jobSkills.length) * 60;

      // Location match
      if (job.state && user.state && job.state === user.state) matchScore += 25;
      if (job.lga && user.lga && job.lga === user.lga) matchScore += 15;

      jobObj.matchScore = Math.min(100, Math.round(matchScore));
      return jobObj;
    });

    // Sort by match score — best matches first
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    return success(res, { jobs: scoredJobs, total: scoredJobs.length, page: Number(page) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/jobs/:id
 * Full job detail page — /jobs/[id].
 */
const getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("postedBy", "firstName lastName businessName creditTier state lga")
      .populate("hiredApplicant", "firstName lastName phone creditTier");

    if (!job) return error(res, "Job not found", 404);
    return success(res, job);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/jobs
 * Post a job — 3-step employer flow, /jobs/post.
 * If escrow is enabled, locks payment via Squad transfer to escrow.
 */
const postJob = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      title, description, skills, languages,
      state, lga, jobType, category,
      payAmount, payFrequency, escrowEnabled,
    } = req.body;

    const job = await Job.create({
      postedBy: user._id,
      title, description, skills, languages,
      state, lga, jobType, category,
      payAmount: payAmount ? nairaToKobo(payAmount) : undefined,
      payFrequency,
      escrowEnabled: escrowEnabled || false,
      escrowStatus: escrowEnabled ? "locked" : "none",
      escrowLockedAt: escrowEnabled ? new Date() : undefined,
    });

    // TODO: If escrowEnabled, initiate Squad escrow lock here
    // const escrowRef = generateTransactionRef("ESCROW");
    // await squadService.transferFunds({ ... lock funds ... });
    // job.escrowRef = escrowRef;
    // await job.save();

    return success(res, job, "Job posted successfully", 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/jobs/mine/posted
 * Employer's posted jobs — /jobs/mine.
 */
const getMyPostedJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id })
      .populate("hiredApplicant", "firstName lastName phone")
      .sort({ createdAt: -1 });
    return success(res, { jobs, count: jobs.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * GET /api/jobs/mine/applied
 * Worker's applied jobs.
 */
const getMyAppliedJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ "applications.applicant": req.user._id })
      .populate("postedBy", "firstName lastName businessName")
      .sort({ createdAt: -1 });

    const withStatus = jobs.map((job) => {
      const myApp = job.applications.find(
        (a) => a.applicant.toString() === req.user._id.toString()
      );
      return { ...job.toObject(), myApplicationStatus: myApp?.status };
    });

    return success(res, { jobs: withStatus, count: withStatus.length });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * POST /api/jobs/:id/apply
 * Worker applies for a job.
 */
const applyForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return error(res, "Job not found", 404);
    if (job.status !== "open") return error(res, "This job is no longer accepting applications", 400);

    const alreadyApplied = job.applications.some(
      (a) => a.applicant.toString() === req.user._id.toString()
    );
    if (alreadyApplied) return error(res, "You have already applied for this job", 409);

    job.applications.push({
      applicant: req.user._id,
      coverNote: req.body.coverNote,
    });
    await job.save();

    return success(res, { jobId: job._id }, "Application submitted");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * PATCH /api/jobs/:id/hire/:applicantId
 * Employer hires an applicant.
 */
const hireApplicant = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, postedBy: req.user._id });
    if (!job) return error(res, "Job not found or not yours", 404);

    const application = job.applications.id(req.params.applicantId);
    if (!application) return error(res, "Application not found", 404);

    application.status = "hired";
    job.hiredApplicant = application.applicant;
    job.status = "in_progress";

    // Reject all other applicants
    job.applications.forEach((app) => {
      if (app._id.toString() !== req.params.applicantId) app.status = "rejected";
    });

    await job.save();
    return success(res, job, "Applicant hired");
  } catch (err) {
    return error(res, err.message, 500);
  }
};

/**
 * PATCH /api/jobs/:id/complete
 * Employer marks job complete and releases escrow payment to worker.
 * This is the "release escrowed funds" button on /jobs/mine.
 */
const completeJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, postedBy: req.user._id })
      .populate("hiredApplicant");

    if (!job) return error(res, "Job not found or not yours", 404);
    if (job.status !== "in_progress") return error(res, "Job is not in progress", 400);
    if (!job.hiredApplicant) return error(res, "No worker hired for this job", 400);

    // Release escrow — transfer pay to worker's bank account
    if (job.payAmount && job.hiredApplicant.virtualAccountNumber) {
      const paymentRef = generateTransactionRef("GИГPAY");

      await squadService.transferFunds({
        bankCode: job.hiredApplicant.bankCode || "058",
        accountNumber: job.hiredApplicant.virtualAccountNumber,
        accountName: job.hiredApplicant.fullName || job.hiredApplicant.phone,
        amount: job.payAmount,
        remark: `EcoLink gig payment: ${job.title}`,
        transactionReference: paymentRef,
      });

      job.paymentRef = paymentRef;
      job.isPaid = true;
      job.paidAt = new Date();
    }

    job.status = "completed";
    job.escrowStatus = job.escrowEnabled ? "released" : "none";
    job.escrowReleasedAt = new Date();
    await job.save();

    return success(res, job, "Job completed and payment released");
  } catch (err) {
    const { status, message, raw } = extractAxiosError(err);
    return error(res, message, status, raw);
  }
};

module.exports = {
  listJobs, getJob, postJob,
  getMyPostedJobs, getMyAppliedJobs,
  applyForJob, hireApplicant, completeJob,
};