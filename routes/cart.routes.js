const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  addToCart,
  deleteCart,
  deleteBookFromCart,
  getLoggedUserCarts,
} = require("../controllers/cart.controllers");
const {
  addToCartValidator,
  deleteBookFromCartValidator,
  deleteCartValidator,
} = require("../validators/cart.validator");
const router = express.Router();

router
  .route("/cart")
  .get(isAuth, getLoggedUserCarts)
  .post(isAuth, addToCartValidator, addToCart)
  .delete(isAuth, deleteCartValidator, deleteCart);

router.delete(
  "/cart/book/:id",
  isAuth,
  deleteBookFromCartValidator,
  deleteBookFromCart
);

module.exports = router;
