const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Address = require("../models/address.model");
const ApiError = require("../utils/ApiError");

const createAddressValidator = [
  check("country").notEmpty().withMessage("country is required"),
  check("city").notEmpty().withMessage("city is required"),
  check("address").notEmpty().withMessage("address is required"),
  check("phone")
    .notEmpty()
    .withMessage("phone is required")
    .isNumeric()
    .withMessage("Phone number must contain only numeric characters"),
  validatorMiddleware,
];

const updateAddressValidator = [
  check("id")
    .isMongoId()
    .withMessage("invalid id")
    .custom(async (id, { req }) => {
      const address = await Address.findById(id);
      if (!address) throw new ApiError("address not found");
      if (address && address.user.toString() != req.user._id.toString())
        throw new ApiError("this address does not belong to this user");
      return true;
    }),
  check("country").optional().notEmpty().withMessage("country is required"),
  check("city").optional().notEmpty().withMessage("city is required"),
  check("address").optional().notEmpty().withMessage("address is required"),
  check("phone")
    .optional()
    .notEmpty()
    .withMessage("phone is required")
    .isNumeric()
    .withMessage("Phone number must contain only numeric characters"),
  validatorMiddleware,
];

const deleteAddressValidator = [
  check("id")
    .isMongoId()
    .withMessage("invalid id")
    .custom(async (id, { req }) => {
      const address = await Address.findById(id);
      if (!address) throw new ApiError("address not found");
      if (address && address.user.toString() != req.user._id.toString())
        throw new ApiError("this address does not belong to this user");
      return true;
    }),
  validatorMiddleware,
];

module.exports = {
  createAddressValidator,
  updateAddressValidator,
  deleteAddressValidator,
};
