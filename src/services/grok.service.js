const axios = require("axios");
const { GROK_API_KEY, GROK_API_URL, GROK_MODEL } = require("../config");

const DEFAULT_SIGNALS = [
  { label: "Payment reliability", score: 50, evidence: "insufficient detail" },
  { label: "Honesty & integrity", score: 50, evidence: "insufficient detail" },
  { label: "Work ethic", score: 50, evidence: "insufficient detail" },
  { label: "Community standing", score: 50, evidence: "insufficient detail" },
];

const buildPrompt = (transcript) => {
  return `You are an AI trust analyst for EcoLink, a fintech platform for Nigeria's informal economy.
Given a voice-vouch transcript about a person, extract trust signals and return a structured JSON response.
Focus on reliability, honesty, work ethic, and community standing.
If the transcript is empty or low confidence, return neutral scores (50) and a cautious summary.

Transcript:
${transcript}

Return ONLY JSON with this exact shape:
{
  "summary": "short 1-2 sentence summary",
  "signals": [
    { "label": "Payment reliability", "score": 0-100, "evidence": "short phrase" },
    { "label": "Honesty & integrity", "score": 0-100, "evidence": "short phrase" },
    { "label": "Work ethic", "score": 0-100, "evidence": "short phrase" },
    { "label": "Community standing", "score": 0-100, "evidence": "short phrase" }
  ],
  "trustLevel": "Community|Verified|Trusted",
  "confidence": 0-1
}

Expected JSON schema:
- summary: string
- signals: array of 4 objects, each has label, score (0-100), evidence
- trustLevel: Community|Verified|Trusted
- confidence: number 0-1
`;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const neutralResult = (transcript) => ({
  summary: "No clear transcript available; returning neutral trust signals.",
  signals: DEFAULT_SIGNALS,
  trustLevel: "Community",
  confidence: 0.2,
  transcript: transcript || "",
});

const safeParseJson = (content) => {
  if (!content || typeof content !== "string") return null;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonSlice = content.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch (err) {
    return null;
  }
};

const normalizeResponse = (parsed, transcript) => {
  if (!parsed || typeof parsed !== "object") return neutralResult(transcript);

  const summary = typeof parsed.summary === "string" && parsed.summary.trim()
    ? parsed.summary.trim()
    : "No clear transcript available; returning neutral trust signals.";

  const allowedTrust = ["Community", "Verified", "Trusted"];
  const trustLevel = allowedTrust.includes(parsed.trustLevel)
    ? parsed.trustLevel
    : "Community";

  const confidenceRaw = Number(parsed.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? clamp(confidenceRaw, 0, 1)
    : 0.2;

  let signals = DEFAULT_SIGNALS;
  if (Array.isArray(parsed.signals) && parsed.signals.length === 4) {
    signals = parsed.signals.map((signal, idx) => {
      const label = typeof signal.label === "string" && signal.label.trim()
        ? signal.label.trim()
        : DEFAULT_SIGNALS[idx].label;
      const scoreRaw = Number(signal.score);
      const score = Number.isFinite(scoreRaw) ? clamp(scoreRaw, 0, 100) : DEFAULT_SIGNALS[idx].score;
      const evidence = typeof signal.evidence === "string" && signal.evidence.trim()
        ? signal.evidence.trim()
        : DEFAULT_SIGNALS[idx].evidence;
      return { label, score, evidence };
    });
  }

  return {
    summary,
    signals,
    trustLevel,
    confidence,
    transcript: transcript || "",
  };
};

const analyzeVouchTranscript = async (transcript) => {
  if (!GROK_API_KEY) {
    return neutralResult(transcript);
  }

  const prompt = buildPrompt(transcript || "");

  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        model: GROK_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content
      || response?.data?.choices?.[0]?.text;

    const parsed = safeParseJson(content);
    return normalizeResponse(parsed, transcript);
  } catch (err) {
    return neutralResult(transcript);
  }
};

module.exports = { analyzeVouchTranscript, neutralResult };
