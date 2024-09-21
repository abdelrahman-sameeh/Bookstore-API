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
      default: "online",
    },
    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
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
    sales: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

bookSchema.post(/^find/, function (docs) {
  const baseUrl = process.env.BASE_URL || "http://localhost:5000";
  if (docs.length) {
    docs.forEach((doc) => {
      if (doc.imageCover) {
        doc.imageCover = `${baseUrl}/${doc.imageCover}`;
      }
    });
  } else {
    if (docs.imageCover) {
      docs.imageCover = `${baseUrl}/${docs.imageCover}`;
    }
  }
});

const Book = mongoose.model("Book", bookSchema);
module.exports = Book;
