const { validateWebhookSignatureV1, validateWebhookSignatureV2 } = require("../services/squad.service");
const { error } = require("../utils/helpers");

/**
 * Middleware that validates incoming Squad webhook requests.
 * Supports both V1 (full-body HMAC) and V2/V3 (6-field HMAC).
 *
 * Must be applied to the webhook route ONLY.
 * Uses raw body — express.json() must NOT run before this on webhook routes.
 */
const validateWebhook = (req, res, next) => {
  try {
    const body = req.body;
    const version = body?.version; // "v2", "v3", or undefined (v1)

    // Encrypted-body header (v1 direct payments)
    const encryptedHeader = req.headers["x-squad-encrypted-body"];
    // Signature header (v1 virtual accounts / v2 / v3)
    const signatureHeader = req.headers["x-squad-signature"] || encryptedHeader;

    if (!signatureHeader) {
      console.warn("[Webhook] Missing Squad signature header — request rejected");
      return error(res, "Missing webhook signature", 401);
    }

    let isValid = false;

    if (version === "v2" || version === "v3") {
      isValid = validateWebhookSignatureV2(body, signatureHeader);
    } else {
      isValid = validateWebhookSignatureV1(body, signatureHeader);
    }

    if (!isValid) {
      console.warn("[Webhook] Signature mismatch — possible spoofed request");
      return error(res, "Invalid webhook signature", 401);
    }

    next();
  } catch (err) {
    console.error("[Webhook] Validation error:", err.message);
    return error(res, "Webhook validation failed", 500);
  }
};

module.exports = { validateWebhook };
