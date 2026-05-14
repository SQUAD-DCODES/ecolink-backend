const router = require("express").Router();
const ctrl = require("../controllers/webhooks.controller");
const { validateWebhook } = require("../middleware/webhookValidator");

// Squad posts to this URL on every successful payment
router.post("/squad", validateWebhook, ctrl.handleSquadWebhook);

// Missed webhook management
router.get("/errors", ctrl.getWebhookErrors);
router.delete("/errors/:transactionRef", ctrl.clearWebhookError);

module.exports = router;
