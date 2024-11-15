const { default: mongoose } = require("mongoose");
const { getBaseUrl } = require("../utils/getBaseUrl");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: [true, "email must be unique"],
    },
    picture: String,
    password: String,
    resetCode: String,
    resetCodeExpire: Date,
    lastResetPasswordDate: Date,
    role: {
      type: String,
      enum: ["user", "owner", "delivery", "admin"],
      default: "user",
    },
    cart: {
      type: mongoose.Types.ObjectId,
      ref: "Cart",
      required: false,
    },
    onlineBooks: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Book",
      },
    ],
    stripeAccountId: String,
    completedBoarding: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.post(/^find/, function (docs) {
  if (process.env.MODE === "dev") {
    if (docs.picture) {
      docs.picture = `${getBaseUrl()}/${docs.picture}`;
    }
  }
});

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
};
