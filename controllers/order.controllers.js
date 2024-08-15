const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const Transfer = require("../models/transfer.model");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const calculateStripeFee = require("../utils/stripeFee");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const createOrderAndUpdateCart = async (orderData, userId, cart) => {
  // Create the order
  const order = await Order.create(orderData);

  // Find the user
  const user = await User.findById(userId);

  // Iterate through the books in the cart
  for (const item of cart.books) {
    if (item.book.status === "online") {
      // Add the book to the user's onlineBooks
      user.onlineBooks.push(item.book._id);
    } else if (item.book.status === "offline") {
      // Reduce the count of offline books
      await Book.findByIdAndUpdate(item.book._id, {
        $inc: { count: -item.count },
      });
    }
  }

  // Save the updated user
  await user.save();

  // Delete the cart
  await Cart.deleteOne({ _id: cart._id });

  // Return the created order
  return order;
};



const makeOrderInDelivery = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new ApiError("order not found", 404));
  }

  if (order.status == "inProgress") {
    const transfer = await Transfer.findOne({ order: order._id });

    // calculate owner fees
    const owner = await User.findById(transfer.ownerId);
    const ownerFee = Math.floor(
      transfer.amount * 0.9 - calculateStripeFee(transfer.amount)
    );

    // calculate available in main account
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.find(
      (b) => b.currency === "usd"
    ).amount;

    // check if transfer status changed from pending to available 
    const balanceTransaction = await stripe.balanceTransactions.retrieve(
      transfer.balanceTransactionId
    );

    if (balanceTransaction.status === "available") {
      if (availableBalance >= ownerFee) {
        await stripe.transfers.create({
          amount: ownerFee,
          currency: "usd",
          destination: owner.stripeAccountId,
          transfer_group: transfer.paymentIntentId,
        });

        transfer.status = "completed";
        await transfer.save();

        order.status = "inDelivery";
        order.save();
        return res.status(200).json({ status: "success", data: { order } });
      } else {
        return next(new ApiError("not enough money", 400));
      }
    } else {
      return next(new ApiError("transfer not available", 400));
    }
  }

  return next(new ApiError(`order status is ${order.status}`, 400));
});

module.exports = {
  makeOrderInDelivery,
  createOrderAndUpdateCart
};
