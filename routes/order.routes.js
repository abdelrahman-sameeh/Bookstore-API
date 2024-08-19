const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  makeOrderInDelivery,
  handleMakeOrderCompleted,
} = require("../controllers/order.controllers");
const {
  updateOrderStatusValidator,
  handleMakeOrderCompletedValidator,
} = require("../validators/order.validator");
const router = express.Router();

router.put(
  "/updateOrderStatus",
  isAuth,
  // allowTo("admin"),
  updateOrderStatusValidator,
  makeOrderInDelivery
);

router.get(
  "/makeOrderCompleted/:orderId/delivery/:deliverySecretKey",
  handleMakeOrderCompletedValidator,
  handleMakeOrderCompleted
);

module.exports = router;
