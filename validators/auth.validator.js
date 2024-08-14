const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");

const registerValidator = [
  check("name").notEmpty().withMessage("Name is required"),
  check("email").notEmpty().withMessage("Email is required"),
  check("password").notEmpty().withMessage("Password is required"),
  validatorMiddleware,
];

const loginValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .custom(async (email, { req }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("email or password are incorrect");
      }
      req.body.user = user;
      return true;
    }),
  check("password").notEmpty().withMessage("Password is required"),
  validatorMiddleware,
];

const forgetPasswordValidator = [
  check("email").notEmpty().withMessage("email is required"),
  check("code")
    .notEmpty()
    .withMessage("code is required")
    .custom((code) => {
      if (code && code.toString().length != 6) {
        throw new ApiError("code is wrong", 400);
      }
      return true;
    }),
  check("password").notEmpty().withMessage("password is required"),
  validatorMiddleware,
];


const changePasswordValidator = [
  check("password").notEmpty().withMessage("password is required"),
  validatorMiddleware,
];

module.exports = {
  registerValidator,
  loginValidator,
  forgetPasswordValidator,
  changePasswordValidator
};
