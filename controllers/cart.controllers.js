const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const Cart = require("../models/cart.model");
const ApiError = require("../utils/ApiError");

exports.getLoggedUserCarts = asyncHandler(async (req, res, next) => {
  const carts = await Cart.find({ user: req.user._id })
    .populate({ path: "ownerId", select: "name email picture" })
    .populate({
      path: "books.book",
      populate: {
        path: "category",
        select: "name",
      },
    });
  if (!carts.length) {
    return next(new ApiError("cart not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      carts,
    },
  });
});

exports.addToCart = asyncHandler(async (req, res, next) => {
  let { book, count } = req.body;
  const bookDoc = await Book.findById(book);
  if (bookDoc.status == "online" || !count) {
    count = 1;
  }

  // check if book in user model
  const user = req.user;

  if (user.onlineBooks.includes(bookDoc._id.toString())) {
    return next(
      new ApiError("you already have this book in your library", 400)
    );
  }

  let cart = await Cart.findOne({
    user: req.user._id,
    ownerId: bookDoc.owner._id,
  });

  if (!cart) {
    const bookPrice = bookDoc.price;

    if (+count > bookDoc.count) {
      return next(new ApiError("book count is not available", 400));
    }

    cart = new Cart({
      user: req.user._id,
      books: [{ book, count }],
      totalItems: count || 1,
      totalPrice: bookPrice * count,
      ownerId: bookDoc.owner._id,
    });

    await cart.save();
  } else {
    const existingBookIndex = cart.books.findIndex(
      (item) => item.book.toString() === book.toString()
    );

    if (existingBookIndex !== -1) {
      // check if count is available
      if (bookDoc.status == "offline") {
        if (+count + +cart.books[existingBookIndex].count > bookDoc.count) {
          return next(new ApiError("book count is not available", 400));
        }
        cart.books[existingBookIndex].count += count;
      }
    } else {
      if (+count > bookDoc.count) {
        return next(new ApiError("book count is not available", 400));
      } else {
        cart.books.push({ book, count });
      }
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
  await Cart.findOneAndDelete({ user: req.user._id, _id: req.body.cartId });
  res.status(204).json();
});

exports.deleteBookFromCart = asyncHandler(async (req, res, next) => {
  let { count, cartId } = req.body;
  const { id: bookId } = req.params;
  if (!count || +count <= 0) {
    count = 1;
  }

  let cart = await Cart.findOne({ user: req.user._id, _id: cartId });

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

  if (cart.totalItems === 0) {
    await cart.deleteOne();
    return res.status(204).json({});
  }

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
