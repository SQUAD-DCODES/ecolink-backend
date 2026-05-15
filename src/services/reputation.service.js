const Vouch = require("../models/Vouch");
const User = require("../models/User");
const CreditProfile = require("../models/CreditProfile");

const SIGNAL_LABELS = [
  "Payment reliability",
  "Honesty & integrity",
  "Work ethic",
  "Community standing",
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const average = (values) => {
  if (!values.length) return 0;
  const sum = values.reduce((total, val) => total + val, 0);
  return sum / values.length;
};

const buildDefaultSignals = () => {
  return SIGNAL_LABELS.map((label) => ({
    label,
    score: 50,
    evidence: "insufficient detail",
  }));
};

const calculateReputation = ({ signals, confidence, vouchCount }) => {
  const base = average(signals.map((s) => s.score));
  const boost = Math.min(10, Math.floor(vouchCount / 3));
  const score = base * (0.7 + 0.3 * confidence) + boost;
  const overallScore = Math.round(clamp(score, 0, 100));
  const tier = overallScore >= 80 ? "Trusted" : overallScore >= 60 ? "Verified" : "Community";

  return { overallScore, tier };
};

const computeReputationFromVouches = (vouches) => {
  if (!vouches.length) {
    return {
      overallScore: 0,
      tier: "Community",
      vouchCount: 0,
      signals: buildDefaultSignals(),
      confidence: 0.2,
    };
  }

  const signalsByLabel = new Map();
  const evidenceByLabel = new Map();
  SIGNAL_LABELS.forEach((label) => {
    signalsByLabel.set(label, []);
  });

  const confidenceValues = [];

  vouches.forEach((vouch) => {
    if (Array.isArray(vouch.signals) && vouch.signals.length) {
      vouch.signals.forEach((signal) => {
        if (!signalsByLabel.has(signal.label)) return;
        if (Number.isFinite(signal.score)) {
          signalsByLabel.get(signal.label).push(signal.score);
        }
        if (signal.evidence && !evidenceByLabel.has(signal.label)) {
          evidenceByLabel.set(signal.label, signal.evidence);
        }
      });
    } else if (vouch.extractedSignals) {
      const extracted = vouch.extractedSignals;
      const legacySignals = [
        { label: "Payment reliability", score: extracted.reliability },
        { label: "Honesty & integrity", score: extracted.honesty },
        { label: "Work ethic", score: extracted.workEthic },
        { label: "Community standing", score: extracted.communityStanding },
      ];
      legacySignals.forEach((signal) => {
        if (!signalsByLabel.has(signal.label)) return;
        if (Number.isFinite(signal.score)) {
          signalsByLabel.get(signal.label).push(clamp(signal.score * 10, 0, 100));
        }
      });
    }

    if (Number.isFinite(vouch.confidence)) {
      confidenceValues.push(vouch.confidence);
    }
  });

  const signals = buildDefaultSignals().map((signal) => {
    const values = signalsByLabel.get(signal.label) || [];
    const score = values.length ? Math.round(average(values)) : signal.score;
    const evidence = evidenceByLabel.get(signal.label) || signal.evidence;
    return { ...signal, score, evidence };
  });

  const confidence = confidenceValues.length ? clamp(average(confidenceValues), 0, 1) : 0.2;
  const vouchCount = vouches.length;
  const { overallScore, tier } = calculateReputation({ signals, confidence, vouchCount });

  return { overallScore, tier, vouchCount, signals, confidence };
};

const updateUserReputation = async (userId) => {
  const vouches = await Vouch.find({ recipient: userId, status: "processed" })
    .sort({ createdAt: -1 });

  const aggregate = computeReputationFromVouches(vouches);

  await User.findByIdAndUpdate(userId, {
    reputationScore: aggregate.overallScore,
    reputationTier: aggregate.tier,
    vouchCount: aggregate.vouchCount,
    lastReputationUpdatedAt: new Date(),
  });

  await CreditProfile.findOneAndUpdate(
    { user: userId },
    {
      vouchScore: Math.round(aggregate.overallScore / 10),
      vouchesReceived: aggregate.vouchCount,
    }
  );

  return { ...aggregate, vouches };
};

module.exports = {
  computeReputationFromVouches,
  updateUserReputation,
  calculateReputation,
  SIGNAL_LABELS,
};
