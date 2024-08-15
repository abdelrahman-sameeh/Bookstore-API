const mongoose = require("mongoose");

const pendingTransferSchema = new mongoose.Schema(
  {
    paymentIntentId: {
      type: String,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const PendingTransfer = mongoose.model(
  "PendingTransfer",
  pendingTransferSchema
);

module.exports = PendingTransfer;
