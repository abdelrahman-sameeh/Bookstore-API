const { User } = require("../models/user.model");

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
      handleAccountUpdated(event.data.object);
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

module.exports = globalWebhook;
