const { default: mongoose } = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: [true, "category must be unique"],
    },
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema)

module.exports = Category
