const { Chat } = require("../models/chat.model");
const asyncHandler = require("../middlewares/asyncHandler");
const { getBaseUrl } = require("../utils/getBaseUrl");
const { Message } = require("../models/message.model");
const { formatMessageDate } = require("../utils/format-date");
const mongoose = require("mongoose");
const ApiError = require("../utils/api-error");
const { User } = require("../models/user.model");
const { userRoles, chatTypes } = require("../utils/types");
const { getFrontendUrl } = require("../utils/get-frontend-url");

async function findOrCreateRoom(user1Id, user2Id) {
  if (
    !mongoose.isValidObjectId(user1Id) ||
    !mongoose.isValidObjectId(user2Id)
  ) {
    return false;
  }
  let room = await Chat.findOne({
    users: { $all: [user1Id, user2Id] },
  })
    .populate({ path: "users", select: "name picture" })
    .lean();

  if (room) {
    const receiver = room.users.find((user) => user._id == user2Id);
    room.chat = {
      title: receiver.name,
      _id: receiver?._id,
    };
    if (receiver.picture && !receiver.picture.startsWith("http://")) {
      room.chat.picture = `${getBaseUrl()}/${receiver.picture}`;
    }
    return room;
  }

  const users = await User.find({ _id: { $in: [user1Id, user2Id] } });

  if (users.length !== 2) {
    return false;
  }

  const validRoles = Object.values(userRoles);
  const user1Role = users[0].role;
  const user2Role = users[1].role;

  if (!validRoles.includes(user1Role) || !validRoles.includes(user2Role)) {
    return false;
  }

  if (
    (user1Role === "user" && user2Role === "user") ||
    (user1Role === "owner" && user2Role === "delivery") ||
    (user1Role === "delivery" && user2Role === "owner")
  ) {
    return false;
  }

  room = new Chat({
    users: [user1Id, user2Id],
  });

  const roleCombinationToChatType = {
    [`${userRoles.USER}-${userRoles.ADMIN}`]: chatTypes.USER_ADMIN,
    [`${userRoles.ADMIN}-${userRoles.USER}`]: chatTypes.USER_ADMIN,
    [`${userRoles.USER}-${userRoles.DELIVERY}`]: chatTypes.USER_DELIVERY,
    [`${userRoles.DELIVERY}-${userRoles.USER}`]: chatTypes.USER_DELIVERY,
    [`${userRoles.USER}-${userRoles.OWNER}`]: chatTypes.USER_OWNER,
    [`${userRoles.OWNER}-${userRoles.USER}`]: chatTypes.USER_OWNER,
    [`${userRoles.ADMIN}-${userRoles.DELIVERY}`]: chatTypes.ADMIN_DELIVERY,
    [`${userRoles.DELIVERY}-${userRoles.ADMIN}`]: chatTypes.ADMIN_DELIVERY,
    [`${userRoles.ADMIN}-${userRoles.OWNER}`]: chatTypes.ADMIN_OWNER,
    [`${userRoles.OWNER}-${userRoles.ADMIN}`]: chatTypes.ADMIN_OWNER,
  };

  room.chatType = roleCombinationToChatType[`${user1Role}-${user2Role}`];

  await room.save();
  return room;
}

// Helper function to process chat users picture
const _processChatUsersPictures = (users = []) => {
  return users?.map((user) => {
    if (user.picture && !user.picture.startsWith("http://")) {
      user.picture = `${getBaseUrl()}/${user.picture}`;
    }
    return user;
  });
};

// Main function
const getUserChats = asyncHandler(async (req, res, next) => {
  const { archived, blocked } = req.query;
  const user = req.user;
  // get chats that not blocked and to be either archived or not
  const query = {
    users: { $all: [user._id.toString()] },
    archivedBy:
      archived === "true"
        ? { $all: [user._id.toString()] }
        : { $nin: [user._id.toString()] },
    blockedBy: { $nin: [user._id.toString()] },
  };

  if (blocked == "true") {
    delete query["archivedBy"];
    query.blockedBy = { $all: [user._id.toString()] };
  }

  // Fetch chats and last messages
  const chats = await Chat.find(query)
    .populate({ path: "users", select: "name picture" })
    .lean();

  const lastMessagesPromises = chats.map((chat) =>
    Message.findOne({ chat: chat._id }).sort({ createdAt: -1 }).lean()
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
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Return response
  res.status(200).json({
    message: "success",
    data: {
      chats: processedChats,
    },
  });
});

const getChat = async (senderId, receiverId) => {
  if (
    !mongoose.isValidObjectId(senderId) ||
    !mongoose.isValidObjectId(receiverId)
  ) {
    return false;
  }

  let chat = await Chat.findOne({
    users: { $all: [senderId, receiverId] },
  })
    .populate({ path: "users", select: "name picture" })
    .lean();

  if (process.env.MODE === "dev") {
    chat.users = _processChatUsersPictures(chat.users);
  }

  const lastMessage = await Message.findOne({ chat: chat._id })
    .sort({ createdAt: -1 })
    .lean();

  const receiver = chat.users.find(
    (user) => user._id.toString() !== receiverId
  );

  return {
    ...chat,
    chat: {
      _id: senderId,
      title: receiver ? receiver.name : "No receiver",
      picture: receiver && !chat.blockedBy.length ? receiver.picture : null,
      lastMessage: lastMessage
        ? {
            ...lastMessage,
            createdAtFormatted: formatMessageDate(lastMessage.createdAt),
          }
        : null,
    },
  };
};

const archiveChat = asyncHandler(async (req, res, next) => {
  const { id: chatId } = req.params;
  const { user } = req;
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $addToSet: { archivedBy: user.id },
    },
    { new: true }
  );

  if (!chat) {
    return next(new ApiError("Chat not found", 404));
  }

  res.status(200).json({ success: true, data: { chat } });
});

const unarchiveChat = asyncHandler(async (req, res, next) => {
  const { id: chatId } = req.params;
  const { user } = req;

  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { archivedBy: user.id },
    },
    { new: true }
  );

  if (!chat) {
    return next(new ApiError("Chat not found", 404));
  }

  res.status(200).json({ success: true, data: { chat } });
});

function getChatLink(id) {
  if (!id) return false;
  return `${getFrontendUrl()}/chat/${id}`;
}

const getSupporter = asyncHandler(async (req, res, next) => {
  const admins = await User.find({ role: "admin" }).select("_id");
  if (!admins.length) {
    return next(new ApiError("No supporters found"));
  }

  const adminChatCounts = new Map();

  const adminsIds = admins.map((admin) => {
    adminChatCounts.set(admin._id.toString(), 0);
    return admin._id;
  });

  const chats = await Chat.find({
    users: { $in: adminsIds },
  });

  chats.forEach((chat) => {
    chat.users.forEach((userId) => {
      if (adminChatCounts.has(userId.toString())) {
        adminChatCounts.set(
          userId.toString(),
          adminChatCounts.get(userId.toString()) + 1
        );
      }
    });
  });

  let minChatCount = Infinity;
  let leastActiveAdmin = null;

  adminChatCounts.forEach((count, adminId) => {
    if (count < minChatCount) {
      minChatCount = count;
      leastActiveAdmin = adminId;
    }
  });

  const chatLink = getChatLink(leastActiveAdmin);
  if (!chatLink) {
    return next(new ApiError("Failed to generate chat link"));
  }

  return res.json({
    data: {
      message: "success",
      link: chatLink,
    },
  });
});

module.exports = {
  findOrCreateRoom,
  getUserChats,
  getChat,
  archiveChat,
  unarchiveChat,
  getSupporter,
};
