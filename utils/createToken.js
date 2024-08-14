const jwt = require("jsonwebtoken");

exports.createToken = async (payload) =>
  await jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRATION ,
  });
