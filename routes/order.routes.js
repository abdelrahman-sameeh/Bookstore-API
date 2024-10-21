const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  makeOrderInDelivery,
  handleMakeOrderCompleted,
  cancelOrder,
  getUserOrders,
  deleteUserOrders,
} = require("../controllers/order.controllers");
const {
  updateOrderStatusValidator,
  handleMakeOrderCompletedValidator,
  cancelOrderValidation,
} = require("../validators/order.validator");
const router = express.Router();


router.route('/orders')
.get( isAuth, allowTo('user'), getUserOrders)
.delete(isAuth, allowTo('user'), deleteUserOrders)


router.put(
  "/updateOrderStatus",
  isAuth,
  allowTo("admin"),
  updateOrderStatusValidator,
  makeOrderInDelivery
);

router.get(
  "/makeOrderCompleted/:orderId/delivery/:deliverySecretKey",
  handleMakeOrderCompletedValidator,
  handleMakeOrderCompleted
);

router.patch("/orders/:id", isAuth, cancelOrderValidation, cancelOrder)



module.exports = router;
