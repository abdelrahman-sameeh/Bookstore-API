const { findOrCreateRoom } = require("../controllers/chat.controllers");
const {Message} = require("../models/message.model")

module.exports = (io, socket) => {
  socket.on("start_chat", async ({ userId, receivedUserId }) => {
    const roomID = await findOrCreateRoom(userId, receivedUserId);
    socket.join(roomID);
    socket.on("message", async (message) => {
      await Message.create({...message, chat: roomID})
      io.to(roomID).emit("message", message);
    });
  });
};
