const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

const archiveChatValidator = [
  check("id").isMongoId().withMessage("invalid id"),
  validatorMiddleware,
];

module.exports = {
  archiveChatValidator,
};
