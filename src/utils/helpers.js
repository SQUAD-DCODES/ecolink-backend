const { v4: uuidv4 } = require("uuid");
const { SQUAD } = require("../config");

// ── Standard API response shape ──────────────────────────────────────────────

const success = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const error = (res, message = "Something went wrong", statusCode = 500, details = null) => {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
};

// ── ID generators ─────────────────────────────────────────────────────────────

/**
 * Generate a unique customer_identifier for a new EcoLink user.
 * Format: ECO-<shortUUID>
 */
const generateCustomerIdentifier = () => {
  return `ECO-${uuidv4().split("-")[0].toUpperCase()}`;
};

/**
 * Generate a unique transaction reference that includes the Squad merchant ID.
 * Squad requires merchant ID to be embedded in transfer references.
 * Format: <MERCHANT_ID>_<timestamp>_<shortUUID>
 */
const generateTransactionRef = (prefix = "") => {
  const ts = Date.now();
  const uid = uuidv4().split("-")[0].toUpperCase();
  const base = `${ts}_${uid}`;
  return prefix
    ? `${SQUAD.MERCHANT_ID}_${prefix}_${base}`
    : `${SQUAD.MERCHANT_ID}_${base}`;
};

// ── Money helpers ─────────────────────────────────────────────────────────────

/** Convert naira to kobo (Squad uses kobo for amounts). */
const nairaToKobo = (naira) => Math.round(Number(naira) * 100);

/** Convert kobo to naira for display. */
const koboToNaira = (kobo) => (Number(kobo) / 100).toFixed(2);

// ── Error extractor ───────────────────────────────────────────────────────────

/**
 * Extract a clean error message from an Axios error response.
 */
const extractAxiosError = (err) => {
  if (err.response) {
    const { status, data } = err.response;
    return {
      status,
      message: data?.message || data?.error || "Squad API error",
      raw: data,
    };
  }
  return { status: 500, message: err.message || "Network error", raw: null };
};

module.exports = {
  success,
  error,
  generateCustomerIdentifier,
  generateTransactionRef,
  nairaToKobo,
  koboToNaira,
  extractAxiosError,
};
