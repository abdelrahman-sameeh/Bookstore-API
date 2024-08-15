const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const PendingTransfer = require("../models/pending_transfer.model");
const { User } = require("../models/user.model");
const calculateStripeFee = require("../utils/stripeFee");

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

const handleCheckoutSucceeded = async (session) => {
  const paymentIntentId = session.payment_intent;
  const metadata = session.metadata;

  const owner = await User.findById(metadata.ownerId);
  const ownerFee = Math.floor(
    metadata.finalPrice * 0.9 - calculateStripeFee(metadata.finalPrice)
  ); // (90% - Stripe fees) to Owner

  // Check if funds are available
  const balance = await stripe.balance.retrieve();
  const availableBalance = balance.available.find(
    (b) => b.currency === "usd"
  ).amount;

  if (availableBalance >= ownerFee) {
    // Transfer funds to Owner
    await stripe.transfers.create({
      amount: ownerFee,
      currency: "usd",
      destination: owner.stripeAccountId,
      transfer_group: paymentIntentId,
    });
  } else {
    // Store the transfer for later
    await PendingTransfer.create({
      paymentIntentId,
      ownerId: metadata.ownerId,
      amount: metadata.finalPrice,
      status: "pending",
    });
  }

  const cart = await Cart.findById(session.metadata.cartId).populate(
    "books.book"
  );

  const orderData = {
    user: metadata.userId,
    books: cart.books,
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
    paymentType: "online",
    paymentStatus: "paid",
    finalPrice: metadata.finalPrice / 100, // Convert from cents
    status: "completed",
  };

  if (metadata.couponId) {
    orderData.coupon = metadata.couponId;
    orderData.discount = metadata.discount;
  }
  
  await Order.create(orderData);

  const user = await User.findById(metadata.userId);
  cart.books.map((item) => {
    if (item.book.status == "online") {
      user.onlineBooks.push(item.book._id);
    }
  });
  await user.save();

  // Clear cart after order
  // await Cart.deleteOne({ _id: metadata.cartId });
};

const handleBalanceAvailable = async () => {
  const pendingTransfers = await PendingTransfer.find({ status: "pending" });

  for (const transfer of pendingTransfers) {
    const owner = await User.findById(transfer.ownerId);
    const ownerFee = Math.floor(
      transfer.amount * 0.9 - calculateStripeFee(transfer.amount)
    ); // (90% - Stripe fees) to Owner

    // Check if funds are available
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.find(
      (b) => b.currency === "usd"
    ).amount;

    if (availableBalance >= ownerFee) {
      // Transfer funds to Owner
      await stripe.transfers.create({
        amount: ownerFee,
        currency: "usd",
        destination: owner.stripeAccountId,
        transfer_group: transfer.paymentIntentId,
      });

      transfer.status = "completed";
      await transfer.save();
    } else {
      console.log("not available");
    }
  }
};

module.exports = globalWebhook;
