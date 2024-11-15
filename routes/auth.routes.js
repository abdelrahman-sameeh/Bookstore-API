const express = require("express");
const {
  register,
  login,
  sendResetCode,
  forgetPassword,
  isAuth,
  changePassword,
} = require("../controllers/auth.controllers");
const {
  registerValidator,
  loginValidator,
  forgetPasswordValidator,
  changePasswordValidator,
} = require("../validators/auth.validator");
const { getLoggedUser } = require("../controllers/user.controllers");

const router = express.Router();

router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);
router.post("/resetCode", sendResetCode);
router.post("/forgetPassword", forgetPasswordValidator, forgetPassword);
router.post("/changePassword", isAuth, changePasswordValidator, changePassword);
router.get("/auth", isAuth, getLoggedUser);

module.exports = router;
