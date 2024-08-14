const { default: mongoose } = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;