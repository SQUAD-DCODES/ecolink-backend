const router = require("express").Router();
const ctrl = require("../controllers/savings.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", ctrl.listMyGroups);
router.post("/", ctrl.createGroup);
router.get("/:groupId", ctrl.getGroup);
router.post("/:groupId/join", ctrl.joinGroup);
router.post("/:groupId/contribute", ctrl.contribute);
router.post("/:groupId/disburse", ctrl.disburse);

module.exports = router;