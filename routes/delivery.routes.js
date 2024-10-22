const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const { getDeliveries } = require("../controllers/delivery.controllers");

const router = express.Router();

router.get("/deliveries", isAuth, allowTo("admin"), getDeliveries);

module.exports = router;
