const { findOrCreateRoom } = require("../controllers/chat.controllers");
const {Message} = require("../models/message.model");
const { formatMessageDate } = require("../utils/format-date");

module.exports = (io, socket) => {
  socket.on("start_chat", async ({ userId, receivedUserId }) => {
    const roomID = await findOrCreateRoom(userId, receivedUserId);
    socket.join(roomID);
    socket.on("message", async (message) => {
      // await checkValidChat()
      const newMessage = (await Message.create({...message, chat: roomID})).toObject()
      let createdAtFormatted = formatMessageDate(newMessage.createdAt)
      let responseMessage = {
        ...newMessage,
        createdAtFormatted
      }
      io.to(roomID).emit("message", responseMessage);
    });
  });
};
