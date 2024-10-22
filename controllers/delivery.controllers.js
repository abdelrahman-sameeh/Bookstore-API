const asyncHandler = require("../middlewares/asyncHandler");
const Delivery = require("../models/delivery.model");

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
