const router = require("express").Router();
const ctrl = require("../controllers/payments.controller");

router.post("/card", ctrl.chargeCard);
router.post("/authorize", ctrl.authorizePayment);
router.post("/ussd", ctrl.initiateUssd);
router.post("/bank", ctrl.initiateDirectBank);
router.post("/bank/validate", ctrl.validateBankPayment);

module.exports = router;
