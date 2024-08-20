const { check } = require("express-validator");
const validatorMiddleware = require("../middlewares/validatorMiddleware");
const Category = require("../models/category.model");
const ApiError = require("../utils/ApiError");
const Book = require("../models/book.model");

const createBookValidator = [
  check("title").notEmpty().withMessage("title is required"),
  check("author").notEmpty().withMessage("author is required"),
  check("count").optional().isInt().withMessage("count must be number"),
  check("price").notEmpty().withMessage("price is required"),
  check("status")
    .notEmpty()
    .withMessage("status is required")
    .custom((status) => {
      const statusEnum = ["online", "offline"];
      if (!statusEnum.includes(status)) {
        throw new ApiError("status can be online or offline only", 400);
      }
      return true;
    }),
  check("category")
    .notEmpty()
    .withMessage("category is required")
    .isMongoId()
    .withMessage("invalid category id")
    .custom(async (catId) => {
      const category = await Category.findById(catId);
      if (!category) {
        throw new ApiError("category not found");
      }
      return true;
    }),
  validatorMiddleware,
];

const getBookValidator = [
  check("id")
    .notEmpty()
    .withMessage("id is required")
    .isMongoId()
    .withMessage("invalid book id"),
  validatorMiddleware,
];

const updateBookValidator = [
  check("id")
    .notEmpty()
    .withMessage("id is required")
    .isMongoId()
    .withMessage("invalid book id")
    .custom(async (id, { req }) => {
      const book = await Book.findOne({ _id: id, owner: req.user._id });
      if (!book) {
        throw new ApiError("You are not the owner of this book");
      }
      return true;
    }),
  check("title").optional().notEmpty().withMessage("title is required"),
  check("author").optional().notEmpty().withMessage("author is required"),
  check("count").optional().isInt().withMessage("count must be number"),
  check("price").optional().notEmpty().withMessage("price is required"),
  check("status")
    .optional()
    .notEmpty()
    .withMessage("status is required")
    .custom((status) => {
      const statusEnum = ["online", "offline"];
      if (!statusEnum.includes(status)) {
        throw new ApiError("status can be online or offline only", 400);
      }
      return true;
    }),
  check("category")
    .optional()
    .notEmpty()
    .withMessage("category is required")
    .isMongoId()
    .withMessage("invalid category id")
    .custom(async (catId) => {
      const category = await Category.findById(catId);
      if (!category) {
        throw new ApiError("category not found");
      }
      return true;
    }),
  validatorMiddleware,
];

const deleteBookValidator = [
  check("id")
    .notEmpty()
    .withMessage("id is required")
    .isMongoId()
    .withMessage("invalid book id")
    .custom(async (id, { req }) => {
      const book =
        req.user.role == "owner"
          ? await Book.findOne({
              _id: id,
              owner: req.user._id,
            })
          : await Book.findById(id);
      if (!book) {
        throw new ApiError("You are not the owner of this book");
      }
      return true;
    }),
  validatorMiddleware,
];

const reviewBookValidator = [
  check("id").isMongoId().withMessage("invalid book id"),
  check("reviewStatus")
    .notEmpty()
    .withMessage("reviewStatus is required")
    .custom(async (reviewStatus, {req}) => {
      const reviews = ["approved", "denied"]
      if (!reviews.includes(reviewStatus.toLowerCase())) {
        throw new ApiError("review status must be either approved or denied");
      }
      if(reviewStatus.toLowerCase() == "denied" && !req.body.deniedReason){
        throw new ApiError("deniedReason is required", 400);
      }
      return true;
    }),
  validatorMiddleware,
];

module.exports = {
  createBookValidator,
  getBookValidator,
  deleteBookValidator,
  updateBookValidator,
  reviewBookValidator,
};
