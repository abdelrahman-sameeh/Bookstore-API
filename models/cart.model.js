const { default: mongoose } = require("mongoose");

const cartSchema = new mongoose.Schema(
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
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    ownerId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

cartSchema.post("save", async function (doc) {
  await doc.populate({
    path: "ownerId",
    select: "name email",
  });

  await doc.populate({
    path: "books.book",
    populate: {
      path: "category",
      select: "name",
    },
  });
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
