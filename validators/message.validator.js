const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

const getChatMessageValidator = [
  check("receiverId")
    .notEmpty()
    .withMessage("receiverId is required")
    .isMongoId()
    .withMessage("receiverId must be a valid mongo id"),
  validatorMiddleware,
];

module.exports = {
  getChatMessageValidator,
};
