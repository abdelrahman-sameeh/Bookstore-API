const express = require("express");
const router = express.Router();
const { isAuth } = require("../controllers/auth.controllers");
const { getChatMessage } = require("../controllers/messages.controller");
const { getChatMessageValidator } = require("../validators/message.validator");

router.get(
  "/chat/messages/:receiverId",
  isAuth,
  getChatMessageValidator,
  getChatMessage
);

module.exports = router;
