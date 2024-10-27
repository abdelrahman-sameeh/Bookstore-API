const { default: mongoose } = require("mongoose");
const baseUrl = process.env.BASE_URL || "http://localhost:5000";

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
  if (process.env.MODE === "dev") {
    if (docs.length) {
      docs.forEach((doc) => {
        if (doc.imageCover) {
          doc.imageCover = `${baseUrl}/${doc.imageCover}`;
        }
      });
      docs.forEach((doc) => {
        if (doc.book) {
          doc.book = `${baseUrl}/${doc.book}`;
        }
      });
    } else {
      if (docs.imageCover) {
        docs.imageCover = `${baseUrl}/${docs.imageCover}`;
      }
      if (docs.book) {
        docs.book = `${baseUrl}/${docs.book}`;
      }
    }
  }
});

const Book = mongoose.model("Book", bookSchema);
module.exports = Book;
