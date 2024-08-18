const Book = require("../models/book.model");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const Transfer = require("../models/transfer.model");
const { User } = require("../models/user.model");
const calculateStripeFee = require("../utils/stripeFee");
const { createOrderAndUpdateCart } = require("./order.controllers");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const globalWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case "account.updated":
      await handleAccountUpdated(event.data.object);
      break;
    case "checkout.session.completed":
      await handleCheckoutSucceeded(event.data.object);
      break;
    case "balance.available":
      await handleBalanceAvailable(event.data.object);
      break;

    default:
      console.warn(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};

async function handleAccountUpdated(account) {
  if (account.charges_enabled && account.details_submitted) {
    const user = await User.findOne({ stripeAccountId: account.id });
    if (user) {
      user.completedBoarding = true;
      await user.save();
    }
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retrieveChargeWithRetry = async (
  paymentIntentId,
  retries = 10,
  delay = 1000
) => {
  let charge;
  for (let i = 0; i < retries; i++) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
    if (charge.balance_transaction) {
      return charge; // Return if balance_transaction is found
    }
    await wait(delay); // Wait before retrying
  }
  throw new Error("Balance Transaction ID is missing after retries.");
};

const handleCheckoutSucceeded = async (session) => {
  try {
    const paymentIntentId = session.payment_intent;

    if (!paymentIntentId) {
      throw new Error("Payment Intent ID is missing.");
    }

    // Retry retrieving the charge to get the balance transaction ID
    const charge = await retrieveChargeWithRetry(paymentIntentId);
    const balanceTransactionId = charge.balance_transaction;

    const metadata = session.metadata;

    const cart = await Cart.findById(session.metadata.cartId).populate(
      "books.book"
    );
    if (!cart) {
      throw new Error("cart not found");
    }

    const hasOfflineBook = cart.books.some(
      (item) => item.book.status === "offline"
    );

    const orderData = {
      user: metadata.userId,
      books: cart.books,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      paymentType: "online",
      paymentStatus: "paid",
      finalPrice: metadata.finalPrice,
      status: hasOfflineBook ? "inProgress" : "completed",
    };

    if (metadata.couponId) {
      orderData.coupon = metadata.couponId;
      orderData.discount = metadata.discount;
    }

    const order = await createOrderAndUpdateCart(orderData, metadata.userId, cart, "online")

    // Create the transfer
    await Transfer.create({
      paymentIntentId,
      balanceTransactionId,
      ownerId: metadata.ownerId,
      amount: metadata.finalPrice,
      status: "pending",
      order: order._id,
      hasOfflineBook,
    });
  } catch (error) {
    console.error("Error in handleCheckoutSucceeded:", error.message);
    // Handle the error, e.g., log it, notify an admin, etc.
  }
};

const handleBalanceAvailable = async () => {
  const transfers = await Transfer.find({
    status: "pending",
    hasOfflineBook: false,
  }).sort({ createdAt: 1 });

  for (const transfer of transfers) {
    const balanceTransaction = await stripe.balanceTransactions.retrieve(
      transfer.balanceTransactionId
    );

    const owner = await User.findById(transfer.ownerId);
    const ownerFee = Math.floor(
      transfer.amount * 0.9 - calculateStripeFee(transfer.amount)
    );

    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.find(
      (b) => b.currency === "usd"
    ).amount;

    if (
      balanceTransaction.status === "available" &&
      availableBalance >= ownerFee
    ) {
      await stripe.transfers.create({
        amount: ownerFee,
        currency: "usd",
        destination: owner.stripeAccountId,
        transfer_group: transfer.paymentIntentId,
      });

      transfer.status = "completed";
      await transfer.save();
    } else {
      console.log("not enough available balance for the remaining transfers");
      continue;
    }
  }
};

module.exports = {
  globalWebhook,
  retrieveChargeWithRetry,
};
