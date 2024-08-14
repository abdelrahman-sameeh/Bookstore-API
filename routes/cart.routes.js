const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  addToCart,
  deleteCart,
  deleteBookFromCart,
  getLoggedUserCart,
} = require("../controllers/cart.controllers");
const {
  addToCartValidator,
  deleteBookFromCartValidator,
} = require("../validators/cart.validator");
const router = express.Router();

router
  .route("/cart")
  .get(isAuth, getLoggedUserCart)
  .post(isAuth, addToCartValidator, addToCart)
  .delete(isAuth, deleteCart);

router.delete(
  "/cart/book/:id",
  isAuth,
  deleteBookFromCartValidator,
  deleteBookFromCart
);

module.exports = router;
