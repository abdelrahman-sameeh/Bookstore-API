const asyncHandler = require("../middlewares/asyncHandler");
const Cart = require("../models/cart.model");
const Coupon = require("../models/coupon.model");
const { User } = require("../models/user.model");
const ApiError = require("../utils/api-error");
const { createOrderAndUpdateCart } = require("./order.controllers");
const Transfer = require("../models/transfer.model");
const {
  calculateOwnerFee,
  calculateStripeFee,
} = require("../utils/calculate-fees");
const { sendEmail } = require("../utils/sendEmailSetup");
const path = require("path");

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

  // return url
  const url = new URL(
    path.join(process.env.FRONTEND_URL, "dashboard", "owner", "onboarding")
  );
  // Generate the account link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: url.href,
    return_url: url.href,
    type: "account_onboarding",
  });

  res.send({ url: accountLink.url });
});

const createCheckoutSession = asyncHandler(async (req, res, next) => {
  let { couponCode, paymentType, addressId } = req.body;

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

  // check if one book not available (by count)
  const notAvailableItemsInStock = cart.books.filter(
    (item) => item.count > item.book.count
  );
  if (notAvailableItemsInStock.length) {
    return res.status(400).json({
      message: "these books not available",
      books: notAvailableItemsInStock,
    });
  }

  let discount = 0;

  // Check if a coupon code is provided
  let coupon;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode, owner: cart.ownerId });

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
  let finalPrice = amount - (amount * discount) / 100;

  const hasOfflineBook = cart.books.some(
    (item) => item.book.status === "offline"
  );

  if ((hasOfflineBook || paymentType == "offline") && !req.body.addressId) {
    return next(new ApiError("address is required", 400));
  }

  if (hasOfflineBook || paymentType == "offline") {
    finalPrice += +process.env.DELIVERY_TAX;
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
      status:
        hasOfflineBook || paymentType == "offline" ? "inProgress" : "completed",
    };
    if (coupon) {
      orderData.coupon = coupon._id;
      orderData.discount = coupon.discount;
    }
    if (paymentType == "offline") {
      orderData.address = addressId;
    }

    const order = await createOrderAndUpdateCart(
      orderData,
      req.user._id,
      cart,
      paymentType
    );

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
    success_url: `${process.env.FRONTEND_URL}/dashboard/user/orders`,
    cancel_url: `${process.env.FRONTEND_URL}`,
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

const payDebtsForOwners = asyncHandler(async (req, res, next) => {
  const transfers = await Transfer.find({
    status: "pending",
    paymentIntentId: null,
    balanceTransactionId: null,
  });

  const updatedTransfers = [];

  for (const transfer of transfers) {
    const balance = await stripe.balance.retrieve();
    const availableBalance =
      balance.available.find((b) => b.currency === "usd").amount / 100;

    const owner = await User.findById(transfer.ownerId);
    const ownerFee = calculateOwnerFee(transfer.amount);
    const roundedAmount = Math.round(ownerFee * 100);

    if (availableBalance >= transfer.amount) {
      await stripe.transfers.create({
        amount: roundedAmount,
        currency: "usd",
        destination: owner.stripeAccountId,
        transfer_group: transfer.paymentIntentId,
      });

      transfer.status = "completed";
      await transfer.save();

      await sendEmail(
        owner.email,
        "تم تحويل الأموال بنجاح",
        `مرحبًا ${owner.name}
        نود إعلامك بأن تحويل الأموال قد تم بنجاح.
        شكرًا لاستخدامك منصتنا.`
      );
      updatedTransfers.push(transfer);
    }
  }

  res.status(200).json({
    message: "Transfers processed successfully",
    transfers: updatedTransfers,
  });
});

const retryFailedRefunds = async () => {
  try {
    // Find failed transfers
    const failedTransfers = await Transfer.find({
      status: "failedRefund",
    }).populate({
      path: "order",
      populate: {
        path: "user",
        select: "name email",
      },
    });

    for (const transfer of failedTransfers) {
      const balanceTransaction = await stripe.balanceTransactions.retrieve(
        transfer.balanceTransactionId
      );
      const userEmail = transfer.order.user.email;
      const userName = transfer.order.user.name;

      if (balanceTransaction.status === "available") {
        // Attempt refund
        try {
          await stripe.refunds.create({
            payment_intent: transfer.paymentIntentId,
            amount:
              (transfer.amount - calculateStripeFee(transfer.amount)) * 100,
          });

          transfer.status = "completed";
          await transfer.save();

          // Send email to user
          await sendEmail(
            userEmail,
            "Refund Processed Successfully",
            `Dear ${userName},\n\nThe refund for your order ${transfer.order._id} has been processed successfully.\n\nThank you for your patience.\n\nBest regards,\nYour Company Name`
          );
        } catch (refundError) {
          console.error(
            `Error retrying refund for order ${transfer.order._id}:`,
            refundError
          );
        }
      } else continue;
    }
  } catch (error) {}
};

module.exports = {
  onBoarding,
  createCheckoutSession,
  getAvailableBalance,
  payDebtsForOwners,
  retryFailedRefunds,
};
