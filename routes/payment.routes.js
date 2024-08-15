const express = require("express");
const router = express.Router();
const { isAuth } = require("../controllers/auth.controllers");
const {
  onBoarding,
  createCheckoutSession,
  getAvailableBalance,
} = require("../controllers/payment.controllers");
const { createCheckoutSessionValidator } = require("../validators/payment.validator");

// Endpoint to initiate Stripe onboarding for owners
router.post("/stripe/onboard", isAuth, onBoarding);
// Endpoint to handle book purchase
router.post("/purchase", isAuth, createCheckoutSessionValidator, createCheckoutSession);

router.get(
  "/available-balance",
  isAuth,
  // allowTo("admin"),
  getAvailableBalance
);

module.exports = router;
