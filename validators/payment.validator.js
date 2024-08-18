const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Address = require("../models/address.model");
const ApiError = require("../utils/ApiError");

exports.createCheckoutSessionValidator = [
  check("cartId")
    .notEmpty()
    .withMessage("cartId is required")
    .isMongoId()
    .withMessage("invalid cartId")
    .custom((_, { req }) => {
      if (req.body.paymentType == "offline" && !req.body.addressId) {
        throw new ApiError("address id is required", 400);
      }
      return true;
    }),
  check("addressId")
    .optional()
    .isMongoId()
    .withMessage("address invalid id")
    .custom(async (id, { req }) => {
      const address = await Address.findById(id);
      if (!address) {
        throw new ApiError("address not found", 404);
      }
      if (
        address.user.toString() != req.user._id.toString() &&
        req.body.paymentType == "offline"
      ) {
        throw new ApiError("address does not belong to this user", 403);
      }
      return true;
    }),
  validatorMiddleware,
];
