const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

const checkIsExistUserValidator = [
  check("id").notEmpty().withMessage("id is required").isMongoId().withMessage("id must be mongo id"),
  validatorMiddleware,
];

module.exports = {
  checkIsExistUserValidator
}
