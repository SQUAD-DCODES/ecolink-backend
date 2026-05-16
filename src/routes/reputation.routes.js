const router = require("express").Router();
const ctrl = require("../controllers/reputation.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/me", ctrl.getMyReputation);
router.get("/:userId", ctrl.getUserReputation);

module.exports = router;
