const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const { makeOrderInDelivery } = require("../controllers/order.controllers");
const { updateOrderStatusValidator } = require("../validators/order.validator");
const router = express.Router();

router.put(
  "/updateOrderStatus/:id",
  isAuth,
  // allowTo("admin"),
  updateOrderStatusValidator,
  makeOrderInDelivery
);

module.exports = router;
