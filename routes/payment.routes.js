const express = require("express");
const router = express.Router();
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  onBoarding,
  createCheckoutSession,
  getAvailableBalance,
  payDebtsForOwners,
} = require("../controllers/payment.controllers");
const {
  createCheckoutSessionValidator,
} = require("../validators/payment.validator");

// initiate Stripe onboarding for owners
router.post("/stripe/onboard", isAuth, onBoarding);

// handle book purchase
router.post(
  "/purchase",
  isAuth,
  createCheckoutSessionValidator,
  createCheckoutSession
);

router.get(
  "/available-balance",
  isAuth,
  allowTo("admin"),
  getAvailableBalance
);

// Pay the debts for owners
router.post(
  "/stripe/payDebts",
  isAuth,
  allowTo("admin"),
  payDebtsForOwners
);

module.exports = router;
