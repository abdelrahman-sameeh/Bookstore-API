module.exports = (io, socket) => {
  socket.on("disconnect", () => {
    const userId = Object.keys(io.activeUsers).find(
      (key) => io.activeUsers[key] === socket.id
    );

    if (userId) {
      delete io.activeUsers[userId];
    }
  });
};
