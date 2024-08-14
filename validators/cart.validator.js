const { check } = require("express-validator");
const Book = require("../models/book.model");
const ApiError = require("../utils/ApiError");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

exports.addToCartValidator = [
  check("book")
    .notEmpty()
    .withMessage("book id is required")
    .isMongoId()
    .withMessage("invalid id")
    .custom(async (id) => {
      const book = await Book.findById(id);
      if (!book) throw new ApiError("not found", 404);
      return true;
    }),
  check("count")
    .optional()
    .isInt({ min: 1 })
    .withMessage("count must be a positive integer and min value must be equal 1"),
  validatorMiddleware,
];

exports.deleteBookFromCartValidator = [
  check("id")
    .notEmpty()
    .withMessage("book id is required")
    .isMongoId()
    .withMessage("invalid id"),
  check("count")
    .optional()
    .isInt({ min: 1 })
    .withMessage("count must be a positive integer and min value must be equal 1"),
  validatorMiddleware,
];
