const { default: mongoose } = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: String,
    book: String,
    imageCover: String,
    author: String,
    price: Number,
    count: Number,
    status: {
      type: String,
      enum: ["online", "offline"],
      default: 'online'
    },
    owner: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: mongoose.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema);
module.exports = Book;
