const { findOrCreateRoom } = require("../controllers/chat.controllers");

module.exports = (io, socket) => {
  socket.on("start_chat", async ({ userId, receivedUserId }) => {
    const roomID = await findOrCreateRoom(userId, receivedUserId);
    socket.join(roomID);
    socket.on("message", (message) => {
      io.to(roomID).emit("message", message);
    });
  });
};
