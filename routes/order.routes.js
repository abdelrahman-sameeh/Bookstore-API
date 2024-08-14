const express = require("express");
const { createOrderValidator } = require("../validators/order.validator");
const { isAuth } = require("../controllers/auth.controllers");
const { createOrder } = require("../controllers/order.controllers");
const router = express.Router();

// Endpoint to create an order
router.post("/order", isAuth, createOrderValidator, createOrder);

module.exports = router;
