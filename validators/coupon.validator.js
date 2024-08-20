const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Coupon = require("../models/coupon.model");
const ApiError = require("../utils/ApiError");

exports.createCouponValidator = [
  check("code")
    .notEmpty()
    .withMessage("code is required")
    .isLength({ min: 1 })
    .withMessage("code must be at least 1 character long")
    .trim()
    .custom(async (value, {req}) => {
      if (value.trim() === "") {
        throw new ApiError("code cannot be an empty string", 400);
      }
      const coupon = await Coupon.findOne({ code: value, owner: req.user._id });
      if (coupon) throw new ApiError("this coupon already exist", 400);

      return true;
    }),
  check("discount")
    .notEmpty()
    .withMessage("discount is required")
    .isFloat({ max: 100 })
    .withMessage("max discount must be 100")
    .custom((discount) => {
      if (discount <= 0) throw new Error("discount must be greater than 0");
      return true;
    }),
  check("expiryDate")
    .notEmpty()
    .withMessage("expiry date is required")
    .isISO8601()
    .withMessage("expiry date must be a valid date")
    .custom((value) => {
      const expiryDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        throw new ApiError("expiry date must be in the future", 400);
      }
      return true;
    }),
  validatorMiddleware,
];

exports.getDeleteOneCouponValidator = [
  check("id")
    .isMongoId()
    .withMessage("invalid coupon id")
    .custom(async (id, { req }) => {
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        throw new ApiError("coupon not found", 404);
      }
      if(coupon.owner.toString() != req.user._id.toString()){
        throw new ApiError("you do not have permission to access this coupon", 403);
      }
      return true;
    }),
  validatorMiddleware,
];

exports.updateOneCouponValidator = [
  check("id")
    .isMongoId()
    .withMessage("invalid coupon id")
    .custom(async (id, { req }) => {
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        throw new ApiError("coupon not found", 404);
      }
      if(coupon.owner.toString() != req.user._id.toString()){
        throw new ApiError("you do not have permission to access this coupon", 403);
      }
      return true;
    }),
  check("code")
    .optional()
    .notEmpty()
    .withMessage("code is required")
    .isLength({ min: 1 })
    .withMessage("code must be at least 1 character long")
    .trim()
    .custom(async (value) => {
      if (value.trim() === "") {
        throw new ApiError("code cannot be an empty string", 400);
      }
      return true;
    }),
  check("discount")
    .optional()
    .notEmpty()
    .withMessage("discount is required")
    .isFloat({ max: 100 })
    .withMessage("max discount must be 100")
    .custom((discount) => {
      if (discount <= 0) throw new Error("discount must be greater than 0");
      return true;
    }),
  check("expiryDate")
    .optional()
    .notEmpty()
    .withMessage("expiry date is required")
    .isISO8601()
    .withMessage("expiry date must be a valid date")
    .custom((value) => {
      const expiryDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        throw new ApiError("expiry date must be in the future", 400);
      }
      return true;
    }),
  validatorMiddleware,
];
