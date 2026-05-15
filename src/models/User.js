const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // EcoLink identity
    customerIdentifier: { type: String, unique: true, sparse: true, index: true },
    accountType: { type: String, enum: ["individual", "business"], default: "individual" },

    // Auth
    phone: { type: String, required: true, unique: true },
    pin: { type: String, select: false },           // hashed 4-digit PIN
    otpCode: { type: String, select: false },        // current OTP
    otpExpiresAt: { type: Date, select: false },
    isPhoneVerified: { type: Boolean, default: false },

    // Personal info
    firstName: { type: String },
    lastName: { type: String },
    businessName: { type: String },
    email: { type: String, sparse: true },
    gender: { type: String, enum: ["male", "female"] },
    dob: { type: String },
    address: { type: String },
    state: { type: String },
    lga: { type: String },
    bvn: { type: String, select: false },
    bio: { type: String },

    // Skills — matches frontend skills tag cloud
    skills: [{ type: String }],
    languages: [{ type: String }],
    businessType: {
      type: String,
      enum: ["trader", "artisan", "gig_worker", "farmer", "employer", "other"],
    },

    // Squad virtual account
    virtualAccountNumber: { type: String, sparse: true },
    bankCode: { type: String },

    // KYC
    kycStatus: {
      type: String,
      enum: ["none", "pending", "verified", "rejected"],
      default: "none",
    },
    kycDocumentType: {
      type: String,
      enum: ["nin", "bvn", "passport", "drivers_licence"],
    },
    kycDocumentUrl: { type: String },
    kycSelfieUrl: { type: String },
    kycSubmittedAt: { type: Date },

    // Roles
    roles: {
      type: [String],
      enum: ["trader", "jobSeeker", "employer", "ajoMember"],
      default: ["jobSeeker"],
    },

    isOnboarded: { type: Boolean, default: false },

    // Credit
    creditScore: { type: Number, default: 0 },
    creditTier: {
      type: String,
      enum: ["unscored", "bronze", "silver", "gold", "platinum"],
      default: "unscored",
    },

    // Reputation
    reputationScore: { type: Number, default: 0 },
    reputationTier: {
      type: String,
      enum: ["Community", "Verified", "Trusted"],
      default: "Community",
    },
    vouchCount: { type: Number, default: 0 },
    lastReputationUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.virtual("fullName").get(function () {
  return this.businessName || `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

module.exports = mongoose.model("User", userSchema);