const router = require("express").Router();
const ctrl = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", ctrl.getProfile);
router.patch("/", ctrl.updateProfile);
router.post("/kyc", ctrl.submitKyc);
router.post("/checkin", ctrl.dailyCheckIn);

module.exports = router;