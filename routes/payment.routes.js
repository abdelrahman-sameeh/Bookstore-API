const express = require("express");
const router = express.Router();
const { isAuth } = require("../controllers/auth.controllers");
const {
  onBoarding,
  completeOrder,
} = require("../controllers/payment.controllers");

// Endpoint to initiate Stripe onboarding for owners
router.post("/stripe/onboard", isAuth, onBoarding);
// Endpoint to handle book purchase
router.post("/purchase", completeOrder);

module.exports = router;
