const ApiError = require("../utils/ApiError");
const asyncHandler = require("../middlewares/asyncHandler");
const { User } = require("../models/user.model");
const bcrypt = require("bcryptjs");
const { createToken } = require("../utils/createToken");
const { sendEmail } = require("../utils/sendEmailSetup");
const jwt = require("jsonwebtoken");
const Delivery = require("../models/delivery.model");
const {
  generateSecureRandomString,
} = require("../utils/generateSecureRandomString");

const register = asyncHandler(async (req, res, next) => {
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return next(new ApiError("Email already exist", 400));
  }

  let user = new User(req.body);
  user.save();
  const hashed = await bcrypt.hash(req.body.password, 10);
  user.password = hashed;
  user.save();

  // Sanitization
  let payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  // generate token
  const token = await createToken(payload);

  if (req.body.role == "delivery") {
    const secretKey = generateSecureRandomString();

    await sendEmail(
      user.email,
      "Your Secret Key",
      `Your secret key is: ${secretKey}`
    );

    const hashedSecretKey = await bcrypt.hash(secretKey, 10);

    await Delivery.create({ user: user._id, secretKey: hashedSecretKey });
    user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  res.status(201).json({
    status: "success",
    data: {
      user,
      token,
    },
  });
});

const login = asyncHandler(async (req, res, next) => {
  const user = req.body.user;
  const matchPassword = await bcrypt.compare(req.body.password, user.password);
  if (!matchPassword) {
    return next(new ApiError("email or password are incorrect", 400));
  }
  // Sanitization
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
  };

  // generate token
  const token = await createToken(payload);

  res.status(200).json({
    status: "success",
    data: {
      user: payload,
      token,
    },
  });
});

const sendResetCode = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError("user not found", 404));
  }
  // generate random code from 6 digits (encrypted)
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const encryptedResetCode = await bcrypt.hash(resetCode, 10);

  // send email
  await sendEmail(
    user.email,
    "Your password reset code",
    `Your reset code is: ${resetCode}`
  );
  user.resetCode = encryptedResetCode;
  // make this (now + 10min)
  user.resetCodeExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  res.status(200).json({
    status: "success",
    data: { message: "Reset code sent to your email" },
  });
});

const forgetPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError("user not found", 404));
  }
  if (!user.resetCode) {
    return next(new ApiError("reset code not found for this user", 400));
  }
  // check if time still less than user.resetCodeExpire
  const currentTime = new Date();
  if (currentTime > user.resetCodeExpire) {
    return next(new ApiError("Reset code has expired", 400));
  }

  const matchResetCode = await bcrypt.compare(req.body.code, user.resetCode);
  if (!matchResetCode) {
    return next(new ApiError("reset code is wrong", 400));
  }

  user.password = await bcrypt.hash(req.body.password, 10);
  user.resetCode = null;
  user.resetCodeExpire = null;
  user.lastResetPasswordDate = new Date();
  await user.save();

  res.status(200).json({
    status: "success",
    data: { message: "Your password has been successfully changed" },
  });
});

const changePassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  const user = User.findById(req.user._id);
  const hashed = bcrypt.hash(password, 10);
  user.password = hashed;
  await user.save();

  res.status(200).json({
    status: "success",
    data: { message: "Your password has been successfully changed" },
  });
});

const isAuth = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || req.headers.Authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(new ApiError("no token provided", 400));
  }
  const token = authorization.split(" ")[1];
  const decoded = jwt.decode(token);

  if (!decoded._id) {
    return next(new ApiError("invalid token", 400));
  }
  const user = await User.findById(decoded._id);
  if (!user) {
    return next(new ApiError("invalid token", 400));
  }
  if (decoded.exp * 1000 < Date.now()) {
    return next(new ApiError("token has been expired", 401));
  }
  if (
    user.lastResetPasswordDate &&
    user.lastResetPasswordDate.getTime() > decoded.iat * 1000
  ) {
    return next(new ApiError("password changed, please login again", 401));
  }

  req.user = user;
  next();
});

const allowTo =
  (...roles) =>
  (req, res, next) => {
    const rolesEnum = ["user", "admin", "owner"];
    for (const role of roles) {
      if (!rolesEnum.includes(role)) {
        return next(new ApiError(`invalid role ${role}`, 404));
      }
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError("you have no access to this route", 400));
    }

    next();
  };

module.exports = {
  register,
  login,
  sendResetCode,
  forgetPassword,
  changePassword,
  isAuth,
  allowTo,
};
