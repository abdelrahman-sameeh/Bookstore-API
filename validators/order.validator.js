const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Cart = require("../models/cart.model");

exports.createOrderValidator = [
  check("cartId")
    .isMongoId()
    .withMessage("invalid cart id")
    .custom(async (cartId) => {
      const cart = await Cart.findById(cartId);
      if (!cart) {
        throw "cart not found";
      }
      return true;
    }),
  check("couponCode").optional().isString(),
  validatorMiddleware,
];
