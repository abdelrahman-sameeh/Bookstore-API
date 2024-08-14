const asyncHandler = require("../middlewares/asyncHandler");
const Cart = require("../models/cart.model");
const Coupon = require("../models/coupon.model");
const Order = require("../models/order.model");

const createOrder = asyncHandler(async (req, res) => {
  const { cartId, couponCode } = req.body;
  const userId = req.user._id

  // Fetch the cart
  const cart = await Cart.findById(cartId).populate("books.book");

  let discount = 0;
  let coupon;

  // Check if coupon exists and is valid
  if (couponCode) {
    coupon = await Coupon.findOne({
      code: couponCode,
      expiryDate: { $gte: new Date() },
    });

    if (!coupon) {
      return res.status(400).json({ error: "invalid or expired coupon" });
    }

    discount = coupon.discount;
  }

  // Calculate final price
  const finalPrice = cart.totalPrice - discount;

  // Create the order
  const order = new Order({
    user: userId,
    cart: cartId,
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
    coupon: coupon ? coupon._id : null,
    discount,
    finalPrice,
  });

  await order.save();

  res.status(201).json({ order });
});





module.exports = {
  createOrder
}