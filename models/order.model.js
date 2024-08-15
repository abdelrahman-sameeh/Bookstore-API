const { default: mongoose } = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    books: [
      {
        book: {
          type: mongoose.Types.ObjectId,
          ref: "Book",
          required: true,
        },
        count: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
      },
    ],
    totalItems: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    coupon: {
      type: mongoose.Types.ObjectId,
      ref: "Coupon",
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "inProgress", "inDelivery", "completed", "cancelled"],
      default: "pending",
    },
    paymentType: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    paymentIntentId: String,
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
