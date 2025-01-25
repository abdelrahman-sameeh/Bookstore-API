const express = require("express");
const router = express.Router();
const { isAuth } = require("../controllers/auth.controllers");
const { getUserChats, archiveChat, unarchiveChat, getSupporter } = require("../controllers/chat.controllers");
const { archiveChatValidator } = require("../validators/chat.validator");

router.get("/chats", isAuth, getUserChats);
router.put("/chats/:id/archive", isAuth, archiveChatValidator, archiveChat);
router.put("/chats/:id/unarchive", isAuth, archiveChatValidator, unarchiveChat);
router.post("/chat/get-support", isAuth, getSupporter);


module.exports = router;
