const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/register", ctrl.register);
router.post("/verify-otp", ctrl.verifyOtp);
router.post("/resend-otp", ctrl.resendOtp);
router.post("/login", ctrl.login);
router.post("/setup-pin", protect, ctrl.setupPin);
router.get("/me", protect, ctrl.getMe);

module.exports = router;