const asyncHandler = require("../middlewares/asyncHandler");
const Cart = require("../models/cart.model");
const Coupon = require("../models/coupon.model");
const Order = require("../models/order.model");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const Book = require("../models/book.model");
const { createOrderAndUpdateCart } = require("./order.controllers");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getAvailableBalance = asyncHandler(async (req, res) => {
  const balance = await stripe.balance.retrieve();
  res.status(200).json(balance);
});

const onBoarding = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user || user.role !== "owner") {
    return res.status(404).send({ error: "User not found or not an owner" });
  }

  // Create a Stripe account if the user doesn't have one
  let account;
  if (!user.stripeAccountId) {
    account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      business_type: "individual",
      individual: {
        first_name: user.name,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    user.stripeAccountId = account.id;
    await user.save();
  } else {
    account = await stripe.accounts.retrieve(user.stripeAccountId);
  }

  // Generate the account link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: "https://your-website.com/refresh",
    // **** will update it ****
    return_url: "https://your-website.com/return",
    type: "account_onboarding",
  });

  res.send({ url: accountLink.url });
});

const createCheckoutSession = asyncHandler(async (req, res, next) => {
  let { couponCode, paymentType } = req.body;

  if (!paymentType) paymentType = "online";

  const cart = await Cart.findOne({
    user: req.user._id,
    _id: req.body.cartId,
  }).populate({
    path: "books.book",
    populate: {
      path: "owner",
      model: "User",
      select: "stripeAccountId",
    },
  });

  if (!cart || cart.totalItems === 0) {
    return next(new ApiError("cart not found", 404));
  }

  let discount = 0;

  // Check if a coupon code is provided
  let coupon;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return next(new ApiError("invalid coupon code", 400));
    }

    // Check if the coupon has expired
    if (coupon.expiryDate < new Date()) {
      return next(new ApiError("coupon code has expired", 400));
    }

    discount = coupon.discount; // Discount amount
  }

  const amount = cart.totalPrice;
  let finalPrice = amount - amount * discount;

  if (paymentType == "offline") {
    finalPrice += +process.env.OFFLINE_FEE;
  }

  if (finalPrice == 0 || paymentType == "offline") {
    // create order
    const orderData = {
      user: req.user._id,
      books: cart.books,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      paymentType,
      paymentStatus: paymentType == "online" ? "paid" : "unpaid",
      finalPrice,
      status: paymentType == "online" ? "completed" : "inProgress",
    };
    if (coupon) {
      orderData.coupon = coupon._id;
      orderData.discount = coupon.discount;
    }
    const order = await createOrderAndUpdateCart(orderData, req.user._id, cart)

    return res.status(201).json({ status: "success", data: { order } });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Cart Purchase", // Description for the checkout session
          },
          unit_amount: finalPrice * 100, 
        },
        quantity: 1, 
      },
    ],
    mode: "payment",
    success_url: `http://test/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `http://test/cancel`,
    metadata: {
      cartId: cart._id.toString(),
      userId: req.user._id.toString(),
      ownerId: cart.books[0].book.owner._id.toString(),
      couponId: coupon ? coupon._id.toString() : "",
      discount: coupon ? coupon.discount : 0,
      finalPrice,
    },
  });
  res.json({ url: session.url });
});

module.exports = {
  onBoarding,
  createCheckoutSession,
  getAvailableBalance,
};
