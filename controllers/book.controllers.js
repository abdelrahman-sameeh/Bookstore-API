const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const Order = require("../models/order.model");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const Pagination = require("../utils/Pagination");
const { sendEmail } = require("../utils/sendEmailSetup");
const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const { cloudinary } = require("../middlewares/cloudinary");
const path = require("path");
const fs = require("fs");
const { default: axios } = require("axios");

const _validateSortOrder = (value, field) => {
  if (value !== "asc" && value !== "desc") {
    throw new ApiError(`"${field}" value must be "asc" or "desc"`);
  }
  return value === "asc" ? 1 : -1;
};

const getBooks = asyncHandler(async (req, res, next) => {
  const { search, page, limit, categories, minPrice, maxPrice, price, sales } =
    req.query;
  const { role, _id: userId } = req.user || {};
  let query = {};

  const populate = [{ path: "category", select: "name" }];

  if (!role) {
    // for only users
    query.reviewStatus = "approved";
    populate.push({ path: "owner", select: "name email" });
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
  if (sales) {
    sort.sales = _validateSortOrder(sales, "sales");
  }

  const paginator = new Pagination(
    "books",
    Book,
    query,
    page,
    limit,
    sort,
    populate
  );
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

  let newBook = await Book.create(req.body);
  newBook = await newBook.populate("category");

  if (process.env.MODE === "dev") {
    if (newBook.book) {
      newBook.book = `${baseUrl}/${newBook.book}`;
    }
    if (newBook.imageCover) {
      newBook.imageCover = `${baseUrl}/${newBook.imageCover}`;
    }
  }

  res.status(201).json({ status: "success", data: { book: newBook } });
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
    req.body.book = bookFile.path;
  }

  let book = await Book.findById(req.params.id);

  if (req.body.count && book.count > +req.body.count) {
    const ordersCount = await _getOrdersCount(book._id);
    if (ordersCount > +req.body.count) {
      return next(new ApiError("number of orders exceeds book count", 400));
    }
  }

  if (req.body.status && req.body.status == "offline") {
    req.body.book = "";
  }

  const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).populate("category");

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

const getUserOnlineBooks = asyncHandler(async (req, res, next) => {
  const books = await User.findById(req.user._id, "onlineBooks").populate({
    path: "onlineBooks",
    select: "-book",
    populate: [
      {
        path: "category",
        select: "name",
      },
      {
        path: "owner",
        select: "name",
      },
    ],
  });
  return res
    .status(200)
    .json({ message: "success", data: { books: books.onlineBooks } });
});

const getStreamingBook = asyncHandler(async (req, res, next) => {
  const { bookId } = req.params;
  const book = await Book.findById(bookId);

  if (!req.user.onlineBooks?.includes(bookId)) {
    return next(new ApiError("book not includes in onlineBooks", 404));
  }

  if (process.env.MODE === "dev") {
    const localFilePath = path.join(
      __dirname,
      "..",
      "uploads",
      "books",
      book.book.split("/uploads/books/")[1]
    );

    if (!fs.existsSync(localFilePath)) {
      return next(new ApiError("file not found", 404));
    }

    res.setHeader("Content-Type", "application/pdf");

    const fileStream = fs.createReadStream(localFilePath);
    fileStream.pipe(res);
  } else {
    const response = await axios.get(book.book, { responseType: "stream" });


    if(response.status!==200){
      return next(new ApiError('error'))
    }

    const localFilePath = path.join(
      __dirname,
      "..",
      "downloads",
      `${bookId}.pdf`
    );

    // إنشاء الدليل إذا لم يكن موجودًا
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

    // حفظ الملف محليًا
    const writer = fs.createWriteStream(localFilePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      res.setHeader("Content-Type", "application/pdf");
      const fileStream = fs.createReadStream(localFilePath);
      fileStream.pipe(res);

      // حذف الملف بعد إرساله
      setTimeout(() => {
        fs.unlink(localFilePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
      }, 1000);
    });

    writer.on("error", (err) => {
      return next(new ApiError("Error saving file", 500));
    });

  }
});

module.exports = {
  createBook,
  getBooks,
  getOneBook,
  deleteOneBook,
  updateBook,
  reviewBook,
  getUserOnlineBooks,
  getStreamingBook,
};
