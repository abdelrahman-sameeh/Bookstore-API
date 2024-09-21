const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const Order = require("../models/order.model");
const ApiError = require("../utils/ApiError");
const Pagination = require("../utils/Pagination");
const { sendEmail } = require("../utils/sendEmailSetup");

const _validateSortOrder = (value, field) => {
  if (value !== "asc" && value !== "desc") {
    throw new ApiError(`"${field}" value must be "asc" or "desc"`);
  }
  return value === "asc" ? 1 : -1;
};

const getBooks = asyncHandler(async (req, res, next) => {
  const { search, page, limit, categories, minPrice, maxPrice, price, sold } =
    req.query;
  const { role, _id: userId } = req.user || {};
  let query = {};

  const populate = [{field: 'category', select: 'name'}]

  if (!role) {
    // for only users
    query.reviewStatus = "approved";
    populate.push({field: "owner", select: "name email"})
  } else if (role === "owner") {
    // for owner
    query.owner = userId;
  }

  if (categories) {
    query.category = { $in: categories.split(",") };
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = minPrice;
    if (maxPrice) query.price.$lte = maxPrice;
  }

  if (search) {
    query.$or = [
      { author: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
    ];
  }

  let sort = {};
  if (price) {
    sort.price = _validateSortOrder(price, "price");
  }
  if (sold) {
    sort.sales = _validateSortOrder(sold, "sold");
  }


  const paginator = new Pagination("books", Book, query, page, limit, sort, populate);
  const result = await paginator.paginate();

  res.status(200).json(result);
});

const createBook = asyncHandler(async (req, res, next) => {
  if (!req.user.completedBoarding) {
    return next(
      new ApiError("owner has not completed Stripe account onboarding", 400)
    );
  }

  const image = req.files["image"] ? req.files["image"][0] : null;
  const bookFile = req.files["bookFile"] ? req.files["bookFile"][0] : null;
  if (!req.body.imageCover && image) {
    req.body.imageCover = image.path;
  }
  if (!req.body.book && bookFile) {
    req.body.book = bookFile.path;
  }
  req.body.owner = req.user._id;

  const book = await Book.create(req.body);
  res.status(201).json({ status: "success", data: { book } });
});

const getOneBook = asyncHandler(async (req, res, next) => {
  const book = await Book.findById(req.params.id);
  if (!book) {
    return next(new ApiError("book not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { book },
  });
});

const updateBook = asyncHandler(async (req, res, next) => {
  const image = req.files["image"] ? req.files["image"][0] : null;
  const bookFile = req.files["bookFile"] ? req.files["bookFile"][0] : null;

  if (image && process.env.MODE == "dev") {
    req.body.imageCover = image.path;
  }
  if (bookFile && process.env.MODE == "dev") {
    req.body.book = image.path;
  }

  let book = await Book.findById(req.params.id);

  if (req.body.count && book.count > +req.body.count) {
    const ordersCount = await _getOrdersCount(book._id);
    if (ordersCount > +req.body.count) {
      return next(new ApiError("number of orders exceeds book count", 400));
    }
  }

  const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.status(200).json({ status: "success", data: { book: updatedBook } });
});

// Helper function to count orders containing a specific book
async function _getOrdersCount(bookId) {
  const orders = await Order.find({
    status: { $in: ["pending", "inProgress"] },
    "books.book": bookId,
  });

  let totalCount = 0;
  for (const order of orders) {
    for (const item of order.books) {
      if (item.book.toString() === bookId.toString()) {
        totalCount += item.count;
        break;
      }
    }
  }
  return totalCount;
}



const deleteOneBook = asyncHandler(async (req, res, next) => {
  await Book.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

const reviewBook = asyncHandler(async (req, res, next) => {
  let reviewStatus = req.body.reviewStatus.toLowerCase();

  const book = await Book.findByIdAndUpdate(
    req.params.id,
    { reviewStatus },
    { new: true }
  ).populate("owner", "email name");

  if (!book) {
    return next(new ApiError("Book not found", 404));
  }

  // Prepare the email content
  const emailSubject = `Your book "${book.title}" has been ${reviewStatus}`;
  const emailText = `Dear ${book.owner.name},\n\nYour book titled "${
    book.title
  }" has been ${reviewStatus} by our team.${
    reviewStatus == "denied"
      ? `\n\nthe denied reason is ${req.body.deniedReason}.`
      : ""
  }\n\nThank you.`;

  // Send the email to the owner
  await sendEmail(book.owner.email, emailSubject, emailText);
  res.status(200).json({ status: "success", data: book });
});

module.exports = {
  createBook,
  getBooks,
  getOneBook,
  deleteOneBook,
  updateBook,
  reviewBook,
};
