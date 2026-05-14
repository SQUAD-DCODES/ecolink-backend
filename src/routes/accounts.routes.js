const router = require("express").Router();
const ctrl = require("../controllers/accounts.controller");

// Onboarding
router.post("/individual", ctrl.createIndividualAccount);
router.post("/business", ctrl.createBusinessAccount);

// Lookups
router.get("/", ctrl.getAllAccounts);
router.get("/:customerIdentifier", ctrl.getAccountByIdentifier);
router.get("/virtual/:virtualAccountNumber", ctrl.getAccountByVirtualNumber);
router.get("/:customerIdentifier/transactions", ctrl.getAccountTransactions);

// Sandbox testing
router.post("/simulate-payment", ctrl.simulatePayment);

module.exports = router;
