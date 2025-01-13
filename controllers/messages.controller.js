const asyncHandler = require("../middlewares/asyncHandler");
const { Chat } = require("../models/chat.model");
const { Message } = require("../models/message.model");

const getChatMessage = asyncHandler(async (req, res, next) => {
  const { receiverId } = req.params;
  const senderId = req.user._id;

  const chat = await Chat.findOne({
    users: { $all: [receiverId, senderId] },
  });

  const messages = await Message.find({ chat });

  res.json({
    data: {
      message: "success",
      messages,
    },
  });
});

module.exports = {
  getChatMessage,
};
