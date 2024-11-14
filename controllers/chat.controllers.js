const { Chat } = require("../models/chat.model");

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

module.exports = {
  findOrCreateRoom,
};
