const router = require("express").Router();
const ctrl = require("../controllers/wallet.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect); // all wallet routes require auth
router.use((req, res, next) => {
  console.log("👉 Wallet router hit:", req.method, req.originalUrl);
  next();
});

router.post("/create", ctrl.createWallet);
router.get("/balance", ctrl.getBalance);
router.get("/transactions", ctrl.getTransactions);
router.post("/lookup", ctrl.lookupAccount);
router.post("/send", ctrl.sendMoney);
router.post("/payment-link", ctrl.createPaymentLink);
router.post("/ussd", ctrl.initiateUssd);

module.exports = router;