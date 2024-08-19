const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    paymentIntentId: {
      type: String,
    },
    balanceTransactionId: {
      type: String,
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
    order: {
      type: mongoose.Types.ObjectId,
      ref: "Order"
    },
    hasOfflineBook: Boolean
  },
  { timestamps: true }
);

const Transfer = mongoose.model(
  "Transfer",
  transferSchema
);

module.exports = Transfer;
