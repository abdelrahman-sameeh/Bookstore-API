const { default: mongoose } = require("mongoose");
const { findOrCreateRoom, getChat } = require("../controllers/chat.controllers");
const { Message } = require("../models/message.model");
const { formatMessageDate } = require("../utils/format-date");
const { Chat } = require("../models/chat.model");

module.exports = (io, socket) => {
  socket.on("startChat", async ({ userId, receivedUserId }) => {
    const room = await findOrCreateRoom(userId, receivedUserId);
    if (room === false) return false;
    socket.join(room._id.toString());

    io.to(io.activeUsers[userId]).emit("firstChat", room);

    socket.on("message", async (message) => {
      if(room.blockedBy.length){
        return false
      }
      const newMessage = (
        await Message.create({ ...message, chat: room._id.toString() })
      ).toObject();
      let createdAtFormatted = formatMessageDate(newMessage.createdAt);
      let responseMessage = {
        ...newMessage,
        createdAtFormatted,
      };
      io.to(room._id.toString()).emit("message", responseMessage);
    });
  });

  socket.on("message", async (message) => {
    if (
      !mongoose.isValidObjectId(message.sender) ||
      !mongoose.isValidObjectId(message.receiver)
    ) {
      return false;
    }
    if(room.blockedBy.length){
      return false
    }

    const chat = await getChat(message.sender, message.receiver)
    io.to(io.activeUsers[message.receiver]).emit("receivedMessage", chat);
  });


  socket.on("block",async (data) => {
    const {chat, blocker, receiver} = data
    delete chat.chat.title
    delete chat.chat.picture
    chat.chat._id = blocker
    
    io.to(io.activeUsers[receiver]).emit("blocked", chat);
    await Chat.findByIdAndUpdate(chat._id, {
      $addToSet: {blockedBy: blocker}
    })
  })

  socket.on("unblock",async (data) => {
    const {chat, blocker, receiver} = data
    delete chat.chat.title
    delete chat.chat.picture
    chat.chat._id = blocker
    
    io.to(io.activeUsers[receiver]).emit("unBlocked", chat);
    await Chat.findByIdAndUpdate(chat._id, {
      $pull: {blockedBy: blocker}
    })
  })

};
