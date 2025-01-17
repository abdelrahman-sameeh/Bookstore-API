const { Chat } = require("../models/chat.model");
const asyncHandler = require("../middlewares/asyncHandler");
const { getBaseUrl } = require("../utils/getBaseUrl");
const { Message } = require("../models/message.model");
const { formatMessageDate } = require("../utils/format-date");

async function findOrCreateRoom(userID, ownerID) {
  let room = await Chat.findOne({
    users: { $all: [userID, ownerID] },
  });

  if (!room) {
    room = new Chat({
      users: [userID, ownerID],
    });
    await room.save();
  }

  return room._id.toString();
}


// Helper function to process chat users picture
const _processChatUsersPictures = (users) => {
  return users.map((user) => {
    if (user.picture && !user.picture.startsWith("http://")) {
      user.picture = `${getBaseUrl()}/${user.picture}`;
    }
    return user;
  });
};

// Main function
const getUserChats = asyncHandler(async (req, res, next) => {
  const { archived } = req.query;
  const user = req.user;
  const query = {
    users: { $all: [user._id.toString()] },
    archivedBy:
      archived === "true"
        ? { $all: [user._id.toString()] }
        : { $nin: [user._id.toString()] },
  };

  // Fetch chats and last messages
  const chats = await Chat.find(query)
    .populate({ path: "users", select: "name picture" })
    .lean();

  const lastMessagesPromises = chats.map((chat) =>
    Message.findOne({ chat: chat._id }).lean()
  );
  const lastMessages = await Promise.all(lastMessagesPromises);

  // Process chats
  const processedChats = chats.map((chat, index) => {
    if (process.env.MODE === "dev") {
      chat.users = _processChatUsersPictures(chat.users);
    }

    const receiver = chat.users.find(
      (user) => user._id.toString() !== req.user._id.toString()
    );
    const lastMessage = lastMessages[index];

    chat.chat = {
      _id: receiver._id,
      title: receiver ? receiver.name : "No receiver",
      picture: receiver && !chat.blockedBy.length ? receiver.picture : null,
      lastMessage: lastMessage
        ? {
            ...lastMessage,
            createdAtFormatted: formatMessageDate(lastMessage.createdAt),
          }
        : null,
    };
    return chat;
  });

  // Sort chats by the date of the last message
  processedChats.sort((a, b) => {
    const dateA = a.chat.lastMessage?.createdAt || new Date(0);
    const dateB = b.chat.lastMessage?.createdAt || new Date(0);
    return new Date(dateB) - new Date(dateA);
  });

  // Return response
  res.status(200).json({
    message: "success",
    data: {
      chats: processedChats,
    },
  });
});

module.exports = {
  findOrCreateRoom,
  getUserChats,
};
