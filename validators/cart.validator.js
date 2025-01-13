const { check } = require("express-validator");
const Book = require("../models/book.model");
const ApiError = require("../utils/api-error");
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
      if (book.reviewStatus != "approved")
        throw new ApiError("this book is not available", 400);
      return true;
    }),
  check("count")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
      "count must be a positive integer and min value must be equal 1"
    ),
  validatorMiddleware,
];

exports.deleteCartValidator = [
  check("cartId").isMongoId().withMessage("invalid cartId"),
  validatorMiddleware,
];

exports.deleteBookFromCartValidator = [
  check("cartId").isMongoId().withMessage("invalid cartId"),
  check("id")
    .notEmpty()
    .withMessage("book id is required")
    .isMongoId()
    .withMessage("invalid id"),
  check("count")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
      "count must be a positive integer and min value must be equal 1"
    ),
  validatorMiddleware,
];
