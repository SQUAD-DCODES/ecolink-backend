const router = require("express").Router();
const ctrl = require("../controllers/credit.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/score", ctrl.getCreditScore);
router.get("/offers", ctrl.getLoanOffers);
router.get("/loans", ctrl.getMyLoans);
router.post("/apply", ctrl.applyForLoan);
router.post("/loans/:loanId/disburse", ctrl.disburseLoan);

module.exports = router;