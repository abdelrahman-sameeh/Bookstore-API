const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const ApiError = require("../utils/ApiError");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const onBoarding = asyncHandler(async (req, res) => {
  const user = req.user
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





// complete order
const completeOrder = asyncHandler(async (req, res) => {
  const { bookId, paymentMethodId } = req.body;

  const user = req.user
  const book = await Book.findById(bookId).populate("owner");

  if (!user || !book) {
    return next(new ApiError("user or Book not found", 404));
  }

  const owner = book.owner;
  const adminFeePercentage = 10; // Admin fee (10%)
  const ownerFeePercentage = 90; // Owner fee (90%)

  // Calculate amounts
  const amount = book.price * 100; // Convert to cents
  const adminFee = (amount * adminFeePercentage) / 100;
  const ownerFee = (amount * ownerFeePercentage) / 100;

  // Create a PaymentIntent with a Transfer to the owner's Stripe account
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method: paymentMethodId,
    confirm: true,
    application_fee_amount: adminFee, // Admin fee
    transfer_data: {
      destination: owner.stripeAccountId, // Owner's Stripe account
    },
  });

  res.send({ success: true, paymentIntent });
});

module.exports = {
  onBoarding,
  completeOrder,
};
