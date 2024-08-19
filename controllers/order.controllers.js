const path = require("path");
const fs = require("fs");
const asyncHandler = require("../middlewares/asyncHandler");
const Book = require("../models/book.model");
const Order = require("../models/order.model");
const Transfer = require("../models/transfer.model");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const { getBaseUrl } = require("../utils/getBaseUrl");
const calculateStripeFee = require("../utils/stripeFee");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const QRCode = require("qrcode");
const Cart = require("../models/cart.model");
const Delivery = require("../models/delivery.model");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../utils/sendEmailSetup");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

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

    const backendEndpoint = `${getBaseUrl()}/orders/${orderId.toString()}/delivery/YOUR_SECRET_KEY`;
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
  }

  // Save the updated user
  await user.save();

  // Delete the cart
  await Cart.deleteOne({ _id: cart._id });

  // Return the created order
  return order;
};

const makeOrderInDelivery = asyncHandler(async (req, res, next) => {
  const { orderId, deliveryId } = req.body;

  await Delivery.findByIdAndUpdate(
    deliveryId,
    {
      $addToSet: { pendingOrders: orderId },
    },
    { new: true }
  );

  const order = await Order.findByIdAndUpdate(
    orderId,
    { status: "inDelivery" },
    { new: true }
  );
  return res.status(200).json({ status: "success", data: { order } });
});

const handleMakeOrderCompleted = asyncHandler(async (req, res, next) => {
  const { orderId, deliverySecretKey } = req.params;

  // Find the delivery associated with the order
  const delivery = await Delivery.findOne({ pendingOrders: orderId });

  if (!delivery) {
    return next(new ApiError("Delivery not found", 404));
  }

  // Compare the provided secret key with the hashed one stored in the database
  const isMatch = await bcrypt.compare(deliverySecretKey, delivery.secretKey);

  if (!isMatch) {
    return next(new ApiError("invalid secret key", 401));
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
    return next(new ApiError("order not found", 404));
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

  // save online books to user
  const user = await User.findById(order.user);
  for (const item of order.books) {
    if (item.book.status === "online") {
      user.onlineBooks.push(item.book._id);
    }
  }
  await user.save();

  // prepare money to send to owner
  const price = order.finalPrice - process.env.OFFLINE_FEE;

  // send owner money
  const ownerName = order.books[0].book.owner.name
  const ownerEmail = order.books[0].book.owner.email
  const ownerStripeAccountId = order.books[0].book.owner.stripeAccountId;
  const ownerFee = Math.floor(price * 0.9 - calculateStripeFee(price));
  

  const balance = await stripe.balance.retrieve();
  const availableBalance =
    balance.available.find((b) => b.currency === "usd").amount / 100;

  if (availableBalance >= ownerFee) {
    await stripe.transfers.create({
      amount: ownerFee * 100,
      currency: "usd",
      destination: ownerStripeAccountId,
    });

    await sendEmail(
      ownerEmail,
      "تم تحويل الأموال بنجاح",
      `مرحبًا ${ownerName}
      نود إعلامك بأن تحويل الأموال قد تم بنجاح.
      شكرًا لاستخدامك منصتنا.`
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
      `
      مرحبًا ${ownerName}
      نود إعلامك بأن تحويل الأموال قد تم تأخيره. سيتم إتمام التحويل قريبًا.
      شكرًا لتفهمك.`
    );
    return next(new ApiError("not enough money", 400));
  }

  return res.status(200).json({
    status: "success",
    message: "order completed successfully",
    data: { order },
  });
});

module.exports = {
  makeOrderInDelivery,
  createOrderAndUpdateCart,
  handleMakeOrderCompleted,
};
