const router = require("express").Router();
const ctrl = require("../controllers/transfers.controller");

router.get("/balance", ctrl.getBalance);
router.get("/", ctrl.getAllTransfers);
router.post("/lookup", ctrl.lookupAccount);
router.post("/send", ctrl.sendTransfer);
router.post("/requery", ctrl.requeryTransfer);

module.exports = router;
