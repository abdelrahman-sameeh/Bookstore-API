const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

exports.createCheckoutSessionValidator = [
  check("cartId")
    .notEmpty()
    .withMessage("cartId is required")
    .isMongoId()
    .withMessage("invalid cartId"),
  validatorMiddleware
];
