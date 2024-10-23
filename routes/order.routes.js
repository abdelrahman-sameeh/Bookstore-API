const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  makeOrdersInDelivery,
  handleMakeOrdersCompleted,
  cancelOrder,
  getUserOrders,
  deleteUserOrders,
  getAdminOrders,
} = require("../controllers/order.controllers");
const {
  updateOrderStatusValidator,
  handleMakeOrderCompletedValidator,
  cancelOrderValidation,
} = require("../validators/order.validator");
const router = express.Router();

router
  .route("/user/orders")
  .get(isAuth, allowTo("user"), getUserOrders)
  .delete(isAuth, allowTo("user"), deleteUserOrders);


router
  .route("/admin/orders")
  .get(isAuth, allowTo("admin"), getAdminOrders)


router.put(
  "/updateOrderStatus",
  isAuth,
  allowTo("admin"),
  updateOrderStatusValidator,
  makeOrdersInDelivery
);

router.get(
  "/orders/:orderId/delivery/:deliverySecretKey",
  handleMakeOrderCompletedValidator,
  handleMakeOrdersCompleted
);

router.post(
  "/makeOrdersCompleted",
  isAuth,
  allowTo('delivery'),
  handleMakeOrdersCompleted
);

router.patch("/orders/:id", isAuth, cancelOrderValidation, cancelOrder);

module.exports = router;
