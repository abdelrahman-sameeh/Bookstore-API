const asyncHandler = require("../middlewares/asyncHandler");
const { Chat } = require("../models/chat.model");
const { Message } = require("../models/message.model");
const ApiError = require("../utils/api-error");
const { formatMessageDate } = require("../utils/format-date");

const getChatMessage = asyncHandler(async (req, res, next) => {
  const { receiverId } = req.params;
  const senderId = req.user._id;

  const chat = await Chat.findOne({
    users: { $all: [receiverId, senderId] },
  });

  if(!chat){
    return next(new ApiError("chat not found", 404))
  }

  let messages = await Message.find({ chat }).lean();

  messages = messages.map((message) => {
    return {
      ...message,
      createdAtFormatted: formatMessageDate(message.createdAt),
    };
  });

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
