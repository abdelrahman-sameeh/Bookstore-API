const { default: mongoose } = require("mongoose");

const deliverySchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  secretKey: String,
  pendingOrders: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Order",
    },
  ],
  deliveredOrders: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Order",
    },
  ],
}, {timestamps: true});

const Delivery = mongoose.model("Delivery", deliverySchema);

module.exports = Delivery;
