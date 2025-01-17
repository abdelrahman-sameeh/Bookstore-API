const express = require("express");
const router = express.Router();
const { isAuth } = require("../controllers/auth.controllers");
const { getUserChats } = require("../controllers/chat.controllers");

router.get("/chats", isAuth, getUserChats);

module.exports = router;
