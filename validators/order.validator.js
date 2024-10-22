const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Order = require("../models/order.model");
const Delivery = require("../models/delivery.model");
const ApiError = require("../utils/ApiError");

exports.updateOrderStatusValidator = [
  check("ordersIds")
    .isArray()
    .withMessage("orderIds must be an array")
    .custom(async (orderIds) => {
      const orders = await Order.find({ _id: { $in: orderIds } });
      if (orders.length === 0) {
        throw new ApiError("No orders found", 404);
      }

      for (const order of orders) {
        if (!["inProgress", "pending"].includes(order.status)) {
          throw new ApiError(`order status must be pending or inProgress`, 400);
        }
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

exports.cancelOrderValidation = [
  check("id")
    .isMongoId()
    .withMessage("invalid order id")
    .custom(async (orderId, { req }) => {
      const cancelableStatus = ["pending", "inProgress"];
      const order = await Order.findById(orderId).populate("books.book");
      if (!order) {
        throw new ApiError("order not found", 404);
      }
      if (!cancelableStatus.includes(order.status)) {
        throw new ApiError(`order cannot be canceled at this stage`, 400);
      }
      if (req.user._id.toString() != order.user._id.toString()) {
        throw new ApiError(`this order does not belong to you`, 403);
      }
      req.order = order;
      return true;
    }),
  validatorMiddleware,
];
