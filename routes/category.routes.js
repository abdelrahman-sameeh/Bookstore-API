const express = require("express");
const {
  getCategories,
  createCategory,
  getOneCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controllers");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const { createCategoryValidator, updateCategoryValidator, getDeleteCategoryValidator } = require("../validators/category.validator");
const router = express.Router();

router
  .route("/category")
  .get(getCategories)
  .post(isAuth, allowTo("admin"), createCategoryValidator, createCategory);

router
  .route("/category/:id")
  .get(getOneCategory, getDeleteCategoryValidator, )
  .put(isAuth, allowTo("admin"), updateCategoryValidator, updateCategory)
  .delete(isAuth, allowTo("admin"), getDeleteCategoryValidator, deleteCategory);

module.exports = router;
