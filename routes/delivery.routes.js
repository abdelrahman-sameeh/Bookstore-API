const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const { getDeliveries, getDeliveryOrders } = require("../controllers/delivery.controllers");

const router = express.Router();

router.get("/deliveries", isAuth, allowTo("admin"), getDeliveries);
router.get("/delivery/orders", isAuth, allowTo("delivery"), getDeliveryOrders);

module.exports = router;
