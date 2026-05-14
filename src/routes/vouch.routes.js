const router = require("express").Router();
const ctrl = require("../controllers/vouch.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.post("/", ctrl.submitVouch);
router.get("/received", ctrl.getReceivedVouches);
router.get("/given", ctrl.getGivenVouches);
router.get("/user/:userId", ctrl.getUserVouches);

module.exports = router;