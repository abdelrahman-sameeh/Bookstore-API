const asyncHandler = require("../middlewares/asyncHandler");
const Category = require("../models/category.model");
const ApiError = require("../utils/api-error");

const getCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.find();
  res.status(200).json({ status: "success", data: { categories } });
});

const createCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findOne({ name: req.body.name.toLowerCase() });
  if (category) {
    return next(new ApiError("category already exist", 400));
  }
  category = await Category.create({ name: req.body.name.toLowerCase() });
  res.status(201).json({ status: "success", data: { category } });
});

const getOneCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findById(req.params.id);
  if (!category) {
    return next(new ApiError("category not found", 404));
  }
  res.status(200).json({ status: "success", data: { category } });
});

const updateCategory = asyncHandler(async (req, res, next) => {
  const data = {};
  if (req.body.name) {
    data.name = req.body.name.toLowerCase();
  }
  let category = await Category.findOne({ name: req.body.name.toLowerCase() });
  if (category) {
    return next(new ApiError("category already exist", 400));
  }

  category = await Category.findByIdAndUpdate(req.params.id, data, {
    new: true,
  });
  if (!category) {
    return next(new ApiError("category not found", 404));
  }
  res.status(200).json({ status: "success", data: { category } });
});

const deleteCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return next(new ApiError("category not found", 404));
  }
  res.status(204).json();
});

module.exports = {
  getCategories,
  createCategory,
  getOneCategory,
  updateCategory,
  deleteCategory,
};
