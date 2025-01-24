const { default: mongoose } = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    archivedBy: {
      type: [
        {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    blockedBy: {
      type: [
        {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    chatType: {
      type: String,
      enum: [
        "user-admin",
        "user-delivery",
        "user-owner",
        "admin-delivery",
        "admin-owner",
      ],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = { Chat };
