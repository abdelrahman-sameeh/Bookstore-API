const asyncHandler = require("../middlewares/asyncHandler");
const Delivery = require("../models/delivery.model");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");

exports.getDeliveries = asyncHandler(async (req, res, next) => {
  const deliveries = await Delivery.find({}, "user")
    .populate({ path: "user", select: "name email" })
    .sort({ pendingOrders: 1 });

  return res.status(200).json({
    message: "success",
    data: {
      deliveries,
    },
  });
});

exports.getDeliveryOrders = asyncHandler(async (req, res, next) => {
  const { status } = req.query;
  if (status && !["pending", "delivered"].includes(status)) {
    return next(new ApiError("status must be pending or delivered", 400));
  }

  const projection = status === "pending" ? "pendingOrders" : "deliveredOrders";
  const orders = await Delivery.findOne({ user: req.user._id }, projection)
    .populate({
      path: projection,
      populate: {
        path: "books.book",
        select: "-book -createdAt -updatedAt -__v",
      },
    })
    .populate({
      path: projection,
      populate: {
        path: "address",
        select: "-createdAt -updatedAt -__v -user",
      },
    });

  return res.status(200).json({
    message: "success",
    data: { orders: orders[projection] },
  });
});
