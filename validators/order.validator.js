const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Order = require("../models/order.model");
const Delivery = require("../models/delivery.model");
const ApiError = require("../utils/ApiError");

exports.updateOrderStatusValidator = [
  check("orderId")
    .isMongoId()
    .withMessage("invalid order id")
    .custom(async (orderId) => {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError("order not found", 404);
      }
      if (order.status != "inProgress") {
        throw new ApiError("order status must be inProgress", 400);
      }
      return true;
    }),
  check("deliveryId")
    .isMongoId()
    .withMessage("invalid delivery id")
    .custom(async (deliveryId) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) {
        throw new ApiError("delivery not found", 404);
      }
      return true;
    }),
  validatorMiddleware,
];

exports.handleMakeOrderCompletedValidator = [
  check("orderId")
    .isMongoId()
    .withMessage("invalid order id")
    .custom(async (orderId) => {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError("order not found", 404);
      }
      if (order.status != "inDelivery") {
        throw new ApiError("order status must be inDelivery", 400);
      }
      return true;
    }),
  check("deliverySecretKey")
    .isLength({ min: 6 })
    .withMessage("minimum length of deliverySecretKey is 6"),
  validatorMiddleware,
];
