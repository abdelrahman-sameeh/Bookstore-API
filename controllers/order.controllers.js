const path = require("path");
const fs = require("fs");
const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const Order = require("../models/order.model");
const Transfer = require("../models/transfer.model");
const { User } = require("../models/user.model");
const ApiError = require("../utils/api-error");
const { getBaseUrl } = require("../utils/getBaseUrl");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const QRCode = require("qrcode");
const Cart = require("../models/cart.model");
const Delivery = require("../models/delivery.model");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../utils/sendEmailSetup");
const {
  calculateOwnerFee,
  calculateStripeFee,
} = require("../utils/calculate-fees");
const Pagination = require("../utils/Pagination");
const { cloudinary } = require("../middlewares/cloudinary");

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const generateQRCode = async (orderId) => {
  const mode = process.env.MODE || "dev"; // Default to 'development' if not set

  if (mode === "dev") {
    // Development environment: Save QR code locally
    const dirPath = path.join(__dirname, "..", "uploads", "qrcodes");
    const fileName = `${orderId}.png`;
    const qrCodePath = path.join(dirPath, fileName);

    // Ensure the directory exists
    ensureDirectoryExists(dirPath);

    const backendEndpoint = `${getBaseUrl()}/api/v1/orders/${orderId.toString()}/delivery/YOUR_SECRET_KEY`;
    await QRCode.toFile(qrCodePath, backendEndpoint);

    // Construct the local URL
    const qrCodeUrl = `${getBaseUrl()}/uploads/qrcodes/${fileName}`;
    return qrCodeUrl;
  } else {
    // Production environment: Upload QR code to Cloudinary
    const backendEndpoint = `${getBaseUrl()}/orders/${orderId.toString()}/delivery/YOUR_SECRET_KEY`;
    const qrCodeBuffer = await QRCode.toBuffer(backendEndpoint);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            public_id: `book-store/qrcodes/${orderId}`,
            format: "png",
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        )
        .end(qrCodeBuffer);
    });

    // Construct the Cloudinary URL
    const qrCodeUrl = result.secure_url;
    return qrCodeUrl;
  }
};

const createOrderAndUpdateCart = async (
  orderData,
  userId,
  cart,
  paymentType
) => {
  // Create the order
  const order = await Order.create(orderData);

  // Generate QR code based on the order ID (or any relevant data)
  const qrcode = await generateQRCode(order._id.toString());
  order.qrcode = qrcode;
  await order.save();

  // Find the user
  const user = await User.findById(userId);

  // Iterate through the books in the cart
  for (const item of cart.books) {
    if (item.book.status === "online" && paymentType == "online") {
      // Add the book to the user's onlineBooks
      user.onlineBooks.push(item.book._id);
    }
    if (item.book.status === "offline") {
      // Reduce the count of offline books
      await Book.findByIdAndUpdate(item.book._id, {
        $inc: { count: -item.count },
      });
    }
    // increment sales number
    await Book.findByIdAndUpdate(item.book._id, {
      $inc: { sales: item.count },
    });
  }

  // Save the updated user
  await user.save();

  // Delete the cart
  await Cart.deleteOne({ _id: cart._id });

  // Return the created order
  return order;
};

const makeOrdersInDelivery = asyncHandler(async (req, res, next) => {
  const { ordersIds, deliveryId } = req.body;

  await Delivery.findByIdAndUpdate(
    deliveryId,
    {
      $addToSet: { pendingOrders: { $each: ordersIds } },
    },
    { new: true }
  );

  await Order.updateMany(
    { _id: { $in: ordersIds } },
    { status: "inDelivery" },
    { new: true }
  );

  return res.status(200).json({ status: "success" });
});

// const handleMakeOrderCompleted = asyncHandler(async (req, res, next) => {
//   const { orderId, deliverySecretKey } = req.params;

//   // Find the delivery associated with the order
//   const delivery = await Delivery.findOne({ pendingOrders: orderId });

//   if (!delivery) {
//     return next(new ApiError("Delivery not found", 404));
//   }

//   // Compare the provided secret key with the hashed one stored in the database
//   const isMatch = await bcrypt.compare(deliverySecretKey, delivery.secretKey);

//   if (!isMatch) {
//     return next(new ApiError("invalid secret key", 401));
//   }

//   // Continue with the process of marking the order as completed
//   const order = await Order.findById(orderId).populate({
//     path: "books.book",
//     populate: {
//       path: "owner",
//       model: "User",
//       select: "stripeAccountId name email",
//     },
//   });

//   if (!order) {
//     return next(new ApiError("order not found", 404));
//   }

//   // Mark the order as completed
//   order.status = "completed";
//   order.paymentStatus = "paid";
//   await order.save();

//   // Remove the order from the delivery's pendingOrders
//   delivery.pendingOrders = delivery.pendingOrders.filter(
//     (pendingOrderId) => pendingOrderId.toString() !== orderId
//   );
//   delivery.deliveredOrders.push(orderId);
//   await delivery.save();

//   // save online books to user
//   const user = await User.findById(order.user);
//   for (const item of order.books) {
//     if (item.book.status === "online") {
//       user.onlineBooks.push(item.book._id);
//     }
//   }
//   await user.save();

//   // prepare money to send to owner
//   const price = order.finalPrice - process.env.DELIVERY_TAX;

//   // send owner money
//   const ownerName = order.books[0].book.owner.name;
//   const ownerEmail = order.books[0].book.owner.email;
//   const ownerStripeAccountId = order.books[0].book.owner.stripeAccountId;
//   const ownerFee = calculateOwnerFee(price);
//   const roundedAmount = Math.round(ownerFee);

//   const balance = await stripe.balance.retrieve();
//   const availableBalance =
//     balance.available.find((b) => b.currency === "usd").amount / 100;

//   if (availableBalance >= roundedAmount) {
//     await stripe.transfers.create({
//       amount: roundedAmount * 100,
//       currency: "usd",
//       destination: ownerStripeAccountId,
//     });

//     if (order.paymentType == "online") {
//       await Transfer.findOneAndUpdate(
//         { order: order._id },
//         { status: "completed" }
//       );
//     }

//     await sendEmail(
//       ownerEmail,
//       "تم تحويل الأموال بنجاح",
//       `مرحبًا ${ownerName}
//       نود إعلامك بأن تحويل الأموال قد تم بنجاح.
//       شكرًا لاستخدامك منصتنا.`
//     );
//   } else {
//     const transferData = {
//       ownerId: order.books[0].book.owner._id,
//       amount: order.finalPrice,
//       status: "pending",
//       order: order._id,
//     };
//     await Transfer.create(transferData);
//     await sendEmail(
//       ownerEmail,
//       "تأخير في تحويل الأموال",
//       `
//       مرحبًا ${ownerName}
//       نود إعلامك بأن تحويل الأموال قد تم تأخيره. سيتم إتمام التحويل قريبًا.
//       شكرًا لتفهمك.`
//     );
//     return next(new ApiError("not enough money", 400));
//   }

//   return res.status(200).json({
//     status: "success",
//     message: "order completed successfully",
//     data: { order },
//   });
// });

const handleMakeOrdersCompleted = asyncHandler(async (req, res, next) => {
  const ordersIds = req.body.ordersIds || [req.params.orderId];
  const deliverySecretKey = req.params.deliverySecretKey;

  if (req.user) {
    const orders = await Order.find({
      _id: { $in: ordersIds },
      status: "inDelivery",
    });

    if (orders.length !== ordersIds.length) {
      const missingOrders = ordersIds.filter(
        (orderId) => !orders.some((order) => order._id.toString() === orderId)
      );
      return res.status(404).json({
        message: "some orders were not found",
        data: { orders: missingOrders },
      });
    }
  }

  // Loop through each orderId
  for (const orderId of ordersIds) {
    // Find the delivery associated with the order
    const delivery = await Delivery.findOne({ pendingOrders: orderId });

    if (!delivery) {
      return next(new ApiError(`Delivery not found for order ${orderId}`, 404));
    }

    if (!req.user) {
      const isMatch = await bcrypt.compare(
        deliverySecretKey,
        delivery.secretKey
      );

      if (!isMatch) {
        return next(
          new ApiError(`invalid secret key for order ${orderId}`, 401)
        );
      }
    }

    // Continue with the process of marking the order as completed
    const order = await Order.findById(orderId).populate({
      path: "books.book",
      populate: {
        path: "owner",
        model: "User",
        select: "stripeAccountId name email",
      },
    });

    if (!order) {
      return next(new ApiError(`Order not found for order ${orderId}`, 404));
    }

    // Mark the order as completed
    order.status = "completed";
    order.paymentStatus = "paid";
    await order.save();

    // Remove the order from the delivery's pendingOrders
    delivery.pendingOrders = delivery.pendingOrders.filter(
      (pendingOrderId) => pendingOrderId.toString() !== orderId
    );
    delivery.deliveredOrders.push(orderId);
    await delivery.save();

    // Save online books to user
    const user = await User.findById(order.user);
    for (const item of order.books) {
      if (item.book.status === "online") {
        user.onlineBooks.push(item.book._id);
      }
    }
    await user.save();

    // Prepare money to send to owner
    const price = order.finalPrice - process.env.DELIVERY_TAX;

    // Send owner money
    const ownerName = order.books[0].book.owner.name;
    const ownerEmail = order.books[0].book.owner.email;
    const ownerStripeAccountId = order.books[0].book.owner.stripeAccountId;
    const ownerFee = calculateOwnerFee(price);
    const roundedAmount = Math.round(ownerFee);

    const balance = await stripe.balance.retrieve();
    const availableBalance =
      balance.available.find((b) => b.currency === "usd").amount / 100;

    if (availableBalance >= roundedAmount) {
      await stripe.transfers.create({
        amount: roundedAmount * 100,
        currency: "usd",
        destination: ownerStripeAccountId,
      });

      if (order.paymentType === "online") {
        await Transfer.findOneAndUpdate(
          { order: order._id },
          { status: "completed" }
        );
      }

      await sendEmail(
        ownerEmail,
        "تم تحويل الأموال بنجاح",
        `مرحبًا ${ownerName}\nنود إعلامك بأن تحويل الأموال قد تم بنجاح.\nشكرًا لاستخدامك منصتنا.`
      );
    } else {
      const transferData = {
        ownerId: order.books[0].book.owner._id,
        amount: order.finalPrice,
        status: "pending",
        order: order._id,
      };
      await Transfer.create(transferData);
      await sendEmail(
        ownerEmail,
        "تأخير في تحويل الأموال",
        `مرحبًا ${ownerName}\nنود إعلامك بأن تحويل الأموال قد تم تأخيره. سيتم إتمام التحويل قريبًا.\nشكرًا لتفهمك.`
      );
      return next(new ApiError("Not enough money", 400));
    }
  }

  return res.status(200).json({
    status: "success",
    message: "all orders completed successfully",
  });
});

const cancelOrder = asyncHandler(async (req, res, next) => {
  const order = req.order;
  order.status = req.body.status;
  await order.save();

  // if have offline book update stock
  for (const item of order.books) {
    // decrement sales number of book
    await Book.findByIdAndUpdate(item.book._id, {
      $inc: { sales: -item.count },
    });
    // update offline books
    if (item.book["status"] == "offline") {
      await Book.findByIdAndUpdate(item.book._id, {
        $inc: { count: item.count },
      });
    }
  }

  // refund money to user if order payment status is online
  if (order.paymentType == "online" && order.paymentStatus == "paid") {
    const transfer = await Transfer.findOne({ order: order._id });

    const balanceTransaction = await stripe.balanceTransactions.retrieve(
      transfer.balanceTransactionId
    );

    if (balanceTransaction.status !== "available") {
      transfer.status = "failedRefund";
      await transfer.save();
      await sendEmail(
        req.user.email,
        "Refund Processing Delayed",
        `Dear ${req.user.name},\n\nThe refund for your order ${order._id} cannot be processed at the moment as the funds are not yet available. We will notify you once the funds are available and the refund has been processed.\n\nThank you for your patience.\n\nBest regards,\nYour Company Name`
      );

      return res
        .status(200)
        .json({ status: "success", message: "order cancelled successfully" });
    }

    const balance = await stripe.balance.retrieve();
    const availableBalance =
      balance.available.find((b) => b.currency === "usd").amount / 100;
    if (availableBalance >= transfer.amount) {
      await stripe.refunds.create({
        payment_intent: transfer.paymentIntentId,
        amount: (transfer.amount - calculateStripeFee(transfer.amount)) * 100,
      });
      transfer.status = "completed";
      await transfer.save();
      // send email to user
      await sendEmail(
        req.user.email, // User's email
        "Refund Processed Successfully",
        `Dear ${req.user.name},\n\nThe refund for your order ${order._id} has been processed successfully.\n\nThank you for your patience.\n\nBest regards,\nYour Company Name`
      );
    } else {
      transfer.status = "failedRefund";
      await transfer.save();

      await sendEmail(
        req.user.email,
        "Refund Processing Failed",
        `Dear ${req.user.name},\n\nWe regret to inform you that the refund for your order ${order._id} could not be processed successfully. Please contact our support team for further assistance.\n\nThank you for your understanding.`
      );
    }
  }
  return res
    .status(200)
    .json({ status: "success", message: "order cancelled successfully" });
});

const getUserOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id }).populate([
    {
      path: "books.book",
      select: "-book",
      populate: {
        path: "category",
        select: "name",
      },
    },
    {
      path: "address",
      select: "-createdAt -updatedAt -__v -user",
    },
  ]);

  return res.status(200).json({ status: "success", data: { orders } });
});

const deleteUserOrders = asyncHandler(async (req, res, next) => {
  const { orders } = req.body;
  if (!Array.isArray(orders) || orders.length === 0) {
    return next(new ApiError("No orders provided for deletion.", 400));
  }
  for (const orderId of orders) {
    await Order.findByIdAndDelete(orderId);
  }
  return res.status(200).json({ message: "Orders deleted successfully!" });
});

const getAdminOrders = asyncHandler(async (req, res, next) => {
  const { page, limit, status } = req.query;
  let query = {};
  if (status) {
    query.status = status;
  }

  const populate = [
    {
      path: "books.book",
      select: "-book",
      populate: {
        path: "category",
        select: "name",
      },
    },
    {
      path: "address",
      select: "-createdAt -updatedAt -__v -user",
    },
  ];

  const paginator = new Pagination(
    "orders",
    Order,
    query,
    page,
    limit,
    "",
    populate
  );

  const results = await paginator.paginate();
  res.status(200).json(results);
});

module.exports = {
  makeOrdersInDelivery,
  createOrderAndUpdateCart,
  handleMakeOrdersCompleted,
  cancelOrder,
  getUserOrders,
  deleteUserOrders,
  getAdminOrders,
};
