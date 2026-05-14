const router = require("express").Router();
const ctrl = require("../controllers/jobs.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", ctrl.listJobs);
router.post("/", ctrl.postJob);
router.get("/mine/posted", ctrl.getMyPostedJobs);
router.get("/mine/applied", ctrl.getMyAppliedJobs);
router.get("/:id", ctrl.getJob);
router.post("/:id/apply", ctrl.applyForJob);
router.patch("/:id/hire/:applicantId", ctrl.hireApplicant);
router.patch("/:id/complete", ctrl.completeJob);

module.exports = router;