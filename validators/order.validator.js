const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Cart = require("../models/cart.model");

exports.updateOrderStatusValidator = [
  check("id").isMongoId().withMessage("invalid order id"),
  validatorMiddleware
];
