module.exports = (io, socket) => {
  socket.on("register", (userId) => {
    io.activeUsers[userId] = socket.id;
  });
};
