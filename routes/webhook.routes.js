const express = require("express");
const router = express.Router();
const { globalWebhook } = require("../controllers/webhook.controllers");

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  globalWebhook
);

module.exports = router;
