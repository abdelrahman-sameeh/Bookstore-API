const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

const createCategoryValidator = [
  check("name").notEmpty().withMessage("name is required"),
  validatorMiddleware,
];

const getDeleteCategoryValidator = [
  check("id").isMongoId().withMessage("invalid category id"),
  validatorMiddleware,
];

const updateCategoryValidator = [
  check("id").isMongoId().withMessage("invalid category id"),
  check("name").optional().notEmpty().withMessage("name is required"),
  validatorMiddleware,
];

module.exports = {
  createCategoryValidator,
  getDeleteCategoryValidator,
  updateCategoryValidator,
};
