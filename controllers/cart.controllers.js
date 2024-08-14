const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const Cart = require("../models/cart.model");
const ApiError = require("../utils/ApiError");

exports.getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ApiError("cart not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      cart,
    },
  });
});

exports.addToCart = asyncHandler(async (req, res, next) => {
  const { book, count } = req.body;
  let cart = await Cart.findOne({ user: req.user._id });

  const bookDoc = await Book.findById(book);
  if (!cart) {
    const bookPrice = bookDoc.price;

    cart = new Cart({
      user: req.user._id,
      books: [{ book, count: count || 1 }],
      totalItems: count || 1,
      totalPrice: bookPrice * (count || 1),
    });

    await cart.save();
  } else {
    const existingBookIndex = cart.books.findIndex(
      (item) => item.book.toString() === book.toString()
    );

    if (existingBookIndex !== -1) {
      // check if count is available
      if (
        +count + +cart.books[existingBookIndex].count > bookDoc.count &&
        bookDoc.status === "offline"
      ) {
        return next(new ApiError("book count is not available", 400));
      }

      cart.books[existingBookIndex].count += count || 1;
    } else {
      cart.books.push({ book, count: count || 1 });
    }

    cart.totalItems = cart.books.reduce((acc, item) => acc + item.count, 0);
    const totalPrices = await Promise.all(
      cart.books.map(async (item) => {
        const bookDoc = await Book.findById(item.book);
        return bookDoc.price * item.count;
      })
    );

    cart.totalPrice = totalPrices.reduce((acc, price) => acc + price, 0);
    await cart.save();
  }

  res.status(200).json({ status: "success", data: { cart } });
});

exports.deleteCart = asyncHandler(async (req, res, next) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.status(204).json();
});

exports.deleteBookFromCart = asyncHandler(async (req, res, next) => {
  const { count } = req.body || { count: 1 };
  const { id: bookId } = req.params;

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new ApiError("cart not found", 404));
  }

  const bookIndex = cart.books.findIndex(
    (item) => item.book.toString() === bookId.toString()
  );

  if (bookIndex === -1) {
    return next(new ApiError("Book not found in cart", 404));
  }

  // Check if the count to remove is greater than the existing count
  if (count >= cart.books[bookIndex].count) {
    // Remove the book from the cart
    cart.books.splice(bookIndex, 1);
  } else {
    // Decrement the count of the book
    cart.books[bookIndex].count -= count;
  }

  // Recalculate totalItems and totalPrice
  cart.totalItems = cart.books.reduce((acc, item) => acc + item.count, 0);

  const totalPrices = await Promise.all(
    cart.books.map(async (item) => {
      const bookDoc = await Book.findById(item.book);
      if (!bookDoc) {
        return 0;
      }
      return bookDoc.price * item.count;
    })
  );

  cart.totalPrice = totalPrices.reduce((acc, price) => acc + price, 0);

  await cart.save();

  res.status(200).json({ status: "success", data: { cart } });
});
