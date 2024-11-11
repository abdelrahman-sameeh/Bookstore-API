const { default: mongoose } = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    _id: String,
    users: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    archived: {
      type: Boolean,
      default: false,
    },
    blocker: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model(chatSchema);

module.exports = Chat;